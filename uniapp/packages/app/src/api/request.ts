// Copyright (c) 2026 Declaro. All rights reserved.

import { apiBase, requestTimeout } from '../config'
import { clearToken, getToken } from '../utils/storage'
import { uuidv4 } from '../utils/uuid'
import { ApiError, ErrSegment, segmentOf } from './errcode'

/**
 * 统一请求封装（基于 uni.request）。
 *
 * 对齐 Issue #3 验收标准：
 * 1. token 注入：请求拦截器自动加 `Authorization: Bearer <token>`；401 触发重登
 * 2. 错误码处理：统一拦截 code≠0 响应，按段位（1xxxx/3xxxx…）路由提示
 * 3. 幂等键：POST 请求自动生成 `Idempotency-Key`（UUID v4）
 * 4. 限流处理：429 读取 Retry-After，提示用户等待
 */

/** 后端统一响应信封：{ code, msg, data }，code=0 表成功 */
export interface ApiEnvelope<T = unknown> {
  code: number
  msg?: string
  data?: T
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestOptions {
  url: string
  method?: HttpMethod
  /** query 参数 */
  params?: Record<string, string | number | boolean | undefined | null>
  /** request body（POST/PUT） */
  data?: Record<string, unknown> | unknown[]
  /** 自定义 header */
  header?: Record<string, string>
  /** 跳过 token 注入（登录接口自身） */
  skipAuth?: boolean
  /** 覆盖默认超时（毫秒） */
  timeout?: number
  /** 指定 Idempotency-Key（默认 POST 自动生成） */
  idempotencyKey?: string
}

/** 401 未授权处理器：默认清 token + 跳登录页；Issue #5 可覆盖为静默重登+重放 */
type UnauthorizedHandler = () => void | Promise<void>

let unauthorizedHandler: UnauthorizedHandler = defaultUnauthorizedHandler

function defaultUnauthorizedHandler(): void {
  clearToken()
  // reLaunch 清栈，避免返回到需鉴权页
  uni.reLaunch({ url: '/pages/login/index' })
}

/** 覆盖默认 401 处理（Issue #5 静默重登时注入，内部应自行做并发去重） */
export function setUnauthorizedHandler(fn: UnauthorizedHandler): void {
  unauthorizedHandler = fn
}

/** 业务码段位的服务端 msg 缺失兜底文案 */
const SEGMENT_FALLBACK_MSG: Record<ErrSegment, string> = {
  [ErrSegment.Common]: '操作未授权或已失效，请重新登录',
  [ErrSegment.Step]: '步骤操作异常，请重试',
  [ErrSegment.File]: '文件操作异常',
  [ErrSegment.Quality]: '质检服务异常',
  [ErrSegment.Export]: '导出操作异常',
  [ErrSegment.System]: '服务异常，请稍后重试',
}

function buildUrl(url: string, params?: RequestOptions['params']): string {
  const full = url.startsWith('http') ? url : `${apiBase}${url}`
  if (!params) return full
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  if (!qs) return full
  return full.includes('?') ? `${full}&${qs}` : `${full}?${qs}`
}

function toast(msg: string): void {
  uni.showToast({ title: msg, icon: 'none', duration: 2500 })
}

function normalizeHeaders(
  h: Record<string, string> | undefined,
): Record<string, string> {
  if (!h) return {}
  const out: Record<string, string> = {}
  for (const k of Object.keys(h)) out[k.toLowerCase()] = h[k]
  return out
}

function parseRetryAfter(val: string | undefined): number | undefined {
  if (!val) return undefined
  const n = Number(val)
  if (!Number.isNaN(n) && n > 0) return n
  // HTTP-date 形式兜底
  const ms = Date.parse(val)
  if (!Number.isNaN(ms)) return Math.max(1, Math.ceil((ms - Date.now()) / 1000))
  return undefined
}

/**
 * 统一请求入口。
 *
 * 成功：resolve 出 body.data（已脱壳）。
 * 失败：reject 出 ApiError，并已按段位 toast 提示（401 除外，交由 handler）。
 */
export function request<T = unknown>(options: RequestOptions): Promise<T> {
  const {
    url,
    method = 'GET',
    params,
    data,
    header = {},
    skipAuth = false,
    timeout = requestTimeout,
    idempotencyKey,
  } = options

  // 1) token 注入
  if (!skipAuth) {
    const token = getToken()
    if (token) header.Authorization = `Bearer ${token}`
  }

  // 3) POST 幂等键
  if (method === 'POST') {
    header['Idempotency-Key'] = idempotencyKey || uuidv4()
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: buildUrl(url, params),
      method,
      data,
      header,
      timeout,
      success: (res) => {
        const status = res.statusCode
        const headers = normalizeHeaders(
          res.header as Record<string, string> | undefined,
        )

        // 4) 限流：429 读 Retry-After
        if (status === 429) {
          const retryAfter = parseRetryAfter(headers['retry-after'])
          const body = res.data as Partial<ApiEnvelope> | undefined
          const msg = body?.msg || '操作过于频繁，请稍后重试'
          toast(retryAfter ? `请 ${retryAfter} 秒后重试` : msg)
          return reject(
            new ApiError({
              code: body?.code ?? 0,
              msg,
              httpStatus: status,
              retryAfter,
            }),
          )
        }

        // 1) 401 未授权：触发重登流程（不 toast，静默重登场景不打扰用户）
        if (status === 401) {
          const body = res.data as Partial<ApiEnvelope> | undefined
          void unauthorizedHandler()
          return reject(
            new ApiError({
              code: body?.code ?? 10001,
              msg: body?.msg || '登录已过期，请重新登录',
              httpStatus: status,
            }),
          )
        }

        const body = res.data as Partial<ApiEnvelope<T>> | undefined

        // 2xx 且业务码成功：脱壳返回 data
        if (status >= 200 && status < 300 && body && body.code === 0) {
          return resolve(body.data as T)
        }

        // 2) 业务码非 0 或非 2xx：按段位路由提示
        const code = body?.code ?? -1
        const segment = segmentOf(code)
        const msg =
          body?.msg || SEGMENT_FALLBACK_MSG[segment] || '请求失败，请稍后重试'

        if (status >= 500) toast('服务异常，请稍后重试')
        else toast(msg)

        return reject(new ApiError({ code, msg, httpStatus: status }))
      },
      fail: () => {
        // 网络层失败（超时、断网、DNS 等）
        const msg = '网络异常，请检查网络后重试'
        toast(msg)
        return reject(new ApiError({ code: -1, msg, httpStatus: 0 }))
      },
    })
  })
}

/** 便捷方法 */
export const http = {
  get: <T = unknown>(
    url: string,
    params?: RequestOptions['params'],
    opts?: Partial<RequestOptions>,
  ) => request<T>({ url, method: 'GET', params, ...opts }),
  post: <T = unknown>(
    url: string,
    data?: RequestOptions['data'],
    opts?: Partial<RequestOptions>,
  ) => request<T>({ url, method: 'POST', data, ...opts }),
  put: <T = unknown>(
    url: string,
    data?: RequestOptions['data'],
    opts?: Partial<RequestOptions>,
  ) => request<T>({ url, method: 'PUT', data, ...opts }),
  del: <T = unknown>(
    url: string,
    params?: RequestOptions['params'],
    opts?: Partial<RequestOptions>,
  ) => request<T>({ url, method: 'DELETE', params, ...opts }),
}
