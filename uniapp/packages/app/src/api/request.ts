// Copyright (c) 2026 Declaro. All rights reserved.

import { getToken } from '../store/token'

const BASE_URL = 'http://localhost:8080'

type SilentLoginFn = () => Promise<boolean>
type RefreshTokenFn = () => Promise<string>
let _silentLogin: SilentLoginFn | null = null
let _refreshToken: RefreshTokenFn | null = null

export function setAuth(silentLogin: SilentLoginFn, refreshToken: RefreshTokenFn): void {
  _silentLogin = silentLogin
  _refreshToken = refreshToken
}
const REQUEST_TIMEOUT = 15000
const CODE_TOKEN_EXPIRED = 10002
const CODE_UNAUTHORIZED = 10001

export interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  header?: Record<string, string>
  noAuth?: boolean
  timeout?: number
}

export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data?: T
}

let isRefreshing = false
const queue: Array<{
  resolve: (value: any) => void
  reject: (reason: any) => void
  config: RequestConfig
}> = []

function flush(token: string): void {
  queue.forEach(({ resolve, reject, config }) => {
    config.header = { ...config.header, Authorization: `Bearer ${token}` }
    request(config).then(resolve).catch(reject)
  })
  queue.length = 0
}

function failAll(error: unknown): void {
  queue.forEach(({ reject }) => reject(error))
  queue.length = 0
}

export function request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
  const header: Record<string, string> = { ...config.header }
  if (!config.noAuth && !header.Authorization) {
    const token = getToken()
    if (token) {
      header.Authorization = `Bearer ${token}`
    }
  }

  return new Promise<ApiResponse<T>>((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${config.url}`,
      method: config.method || 'GET',
      data: config.data,
      header,
      timeout: config.timeout || REQUEST_TIMEOUT,
      success: (res: UniApp.RequestSuccessCallbackResult) => {
        const body = res.data as ApiResponse<T>
        if (res.statusCode !== 401) {
          resolve(body)
          return
        }
        handle401(config, body, resolve, reject)
      },
      fail: reject,
    })
  })
}

function handle401<T>(
  originalConfig: RequestConfig,
  body: ApiResponse<T>,
  resolve: (value: ApiResponse<T> | PromiseLike<ApiResponse<T>>) => void,
  reject: (reason: any) => void,
): void {
  const code = body?.code

  if (code === CODE_TOKEN_EXPIRED) {
    queue.push({ resolve, reject, config: originalConfig })
    if (!isRefreshing) {
      isRefreshing = true
      _refreshToken!()
        .then((token) => { isRefreshing = false; flush(token) })
        .catch((e) => { isRefreshing = false; failAll(e) })
    }
    return
  }

  if (code === CODE_UNAUTHORIZED) {
    queue.push({ resolve, reject, config: originalConfig })
    if (!isRefreshing) {
      isRefreshing = true
      _silentLogin!()
        .then((ok) => {
          isRefreshing = false
          if (ok) { flush(getToken() || '') }
          else { failAll(new Error('重新登录失败')) }
        })
        .catch((e) => { isRefreshing = false; failAll(e) })
    }
    return
  }

  reject(body)
}
