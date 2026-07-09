// Copyright (c) 2026 Declaro. All rights reserved.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __uniStub as uni } from '../setup'
import { ApiError, ErrSegment } from '../../api/errcode'
import { clearToken, getToken, setToken } from '../../utils/storage'
import { http, request, setUnauthorizedHandler } from '../../api/request'

// ------------------------------------------------------------
// 辅助：配置 uni.request 同步返回指定响应
// ------------------------------------------------------------

type RequestOpts = {
  url: string
  method?: string
  data?: unknown
  header?: Record<string, string>
  success?: (res: unknown) => void
  fail?: (err: unknown) => void
}

function mockSuccess(
  statusCode: number,
  data?: unknown,
  header?: Record<string, string>,
): void {
  vi.mocked(uni.request).mockImplementation((opts: RequestOpts) => {
    opts.success?.({ statusCode, data, header: header ?? {} })
    return {} as never
  })
}

function mockFail(): void {
  vi.mocked(uni.request).mockImplementation((opts: RequestOpts) => {
    opts.fail?.({ errMsg: 'request:fail timeout' })
    return {} as never
  })
}

function lastCallOpts(): RequestOpts {
  const calls = vi.mocked(uni.request).mock.calls
  return calls[calls.length - 1][0] as RequestOpts
}

// ------------------------------------------------------------
// 测试主体
// ------------------------------------------------------------

describe('request 统一封装', () => {
  beforeEach(() => {
    clearToken()
    vi.mocked(uni.showToast).mockClear()
    vi.mocked(uni.reLaunch).mockClear()
  })

  // 注：setUnauthorizedHandler 是模块级状态，仅在"覆盖"测试内部用 finally 恢复，
  // 避免全局 afterEach 提前替换 defaultUnauthorizedHandler 导致其函数体无法被覆盖。

  // ============================================================
  // AC#1 token 注入
  // ============================================================
  describe('AC#1 token 注入', () => {
    it('有 token 时注入 Authorization: Bearer <token>', async () => {
      setToken('tok123', 3600)
      mockSuccess(200, { code: 0, data: 'ok' })
      await request({ url: '/api/test' })
      expect(lastCallOpts().header?.Authorization).toBe('Bearer tok123')
    })

    it('skipAuth=true 不注入 token（登录接口自身）', async () => {
      setToken('tok123', 3600)
      mockSuccess(200, { code: 0, data: 'ok' })
      await request({ url: '/api/test', skipAuth: true })
      expect(lastCallOpts().header?.Authorization).toBeUndefined()
    })

    it('无 token 不注入 Authorization', async () => {
      mockSuccess(200, { code: 0, data: 'ok' })
      await request({ url: '/api/test' })
      expect(lastCallOpts().header?.Authorization).toBeUndefined()
    })
  })

  // ============================================================
  // AC#3 POST 幂等键
  // ============================================================
  describe('AC#3 POST 幂等键', () => {
    it('POST 自动生成 Idempotency-Key 且符合 v4 格式', async () => {
      mockSuccess(200, { code: 0, data: 'ok' })
      await request({ url: '/api/test', method: 'POST', data: { a: 1 } })
      const key = lastCallOpts().header?.['Idempotency-Key']
      expect(key).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    })

    it('GET 不注入 Idempotency-Key', async () => {
      mockSuccess(200, { code: 0, data: 'ok' })
      await request({ url: '/api/test', method: 'GET' })
      expect(lastCallOpts().header?.['Idempotency-Key']).toBeUndefined()
    })

    it('自定义 idempotencyKey 优先于自动生成', async () => {
      mockSuccess(200, { code: 0, data: 'ok' })
      await request({
        url: '/api/test',
        method: 'POST',
        idempotencyKey: 'custom-key',
      })
      expect(lastCallOpts().header?.['Idempotency-Key']).toBe('custom-key')
    })
  })

  // ============================================================
  // AC#1 401 处理
  // ============================================================
  describe('AC#1 401 未授权处理', () => {
    it('401 触发默认 handler：清 token + reLaunch 登录页', async () => {
      setToken('tok', 3600)
      mockSuccess(401, { code: 10001, msg: 'token expired' })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        code: 10001,
        httpStatus: 401,
      })
      expect(getToken()).toBeNull()
      expect(vi.mocked(uni.reLaunch)).toHaveBeenCalledWith({
        url: '/pages/login/index',
      })
    })

    it('401 body 无 code 时默认 10001', async () => {
      mockSuccess(401, {})
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        code: 10001,
      })
    })

    it('setUnauthorizedHandler 可覆盖默认行为（Issue #5 静默重登注入点）', async () => {
      const customHandler = vi.fn()
      setUnauthorizedHandler(customHandler)
      try {
        mockSuccess(401, { code: 10001 })
        await expect(request({ url: '/api/test' })).rejects.toMatchObject({
          httpStatus: 401,
        })
        expect(customHandler).toHaveBeenCalledTimes(1)
        // 覆盖后不应触发 reLaunch
        expect(vi.mocked(uni.reLaunch)).not.toHaveBeenCalled()
      } finally {
        // 恢复默认 handler 行为，避免污染后续测试
        setUnauthorizedHandler(() => {
          clearToken()
          uni.reLaunch({ url: '/pages/login/index' })
        })
      }
    })
  })

  // ============================================================
  // AC#4 限流 429
  // ============================================================
  describe('AC#4 限流 429 处理', () => {
    it('429 + Retry-After 秒数 → toast 含秒数 + retryAfter 透传', async () => {
      mockSuccess(429, { code: 0, msg: 'too many' }, { 'Retry-After': '5' })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        httpStatus: 429,
        retryAfter: 5,
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: '请 5 秒后重试', icon: 'none' }),
      )
    })

    it('429 + 小写 retry-after header 同样生效（normalizeHeaders）', async () => {
      mockSuccess(429, { code: 0, msg: 'x' }, { 'retry-after': '10' })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        retryAfter: 10,
      })
    })

    it('429 无 Retry-After 时用 body.msg', async () => {
      mockSuccess(429, { code: 0, msg: '操作过于频繁' })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        retryAfter: undefined,
        msg: '操作过于频繁',
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: '操作过于频繁', icon: 'none' }),
      )
    })

    it('429 无 body.msg 用兜底文案', async () => {
      mockSuccess(429, {})
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        msg: '操作过于频繁，请稍后重试',
      })
    })

    it('429 + Retry-After 为 HTTP-date 格式 → 解析为剩余秒数（覆盖 parseRetryAfter 兜底分支）', async () => {
      const futureDate = new Date(Date.now() + 30000).toUTCString()
      mockSuccess(429, { code: 0, msg: 'x' }, { 'Retry-After': futureDate })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        retryAfter: expect.any(Number),
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/^请 \d+ 秒后重试$/) }),
      )
    })

    it('429 + Retry-After 为无效格式 → retryAfter undefined，用 body.msg（覆盖 return undefined 兜底）', async () => {
      mockSuccess(429, { code: 0, msg: '限流中' }, { 'Retry-After': 'invalid-garbage' })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        retryAfter: undefined,
        msg: '限流中',
      })
    })
  })

  // ============================================================
  // AC#2 业务码处理
  // ============================================================
  describe('AC#2 业务码处理', () => {
    it('200 + code=0 脱壳返回 data', async () => {
      mockSuccess(200, { code: 0, data: { id: 1 }, msg: 'ok' })
      const res = await request<{ id: number }>({ url: '/api/test' })
      expect(res).toEqual({ id: 1 })
    })

    it('200 + code=10001 toast Common 段位兜底文案', async () => {
      mockSuccess(200, { code: 10001 }) // 无 msg
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        code: 10001,
        segment: ErrSegment.Common,
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: '操作未授权或已失效，请重新登录' }),
      )
    })

    it('200 + code=30001 toast File 段位兜底文案', async () => {
      mockSuccess(200, { code: 30001 })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        segment: ErrSegment.File,
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: '文件操作异常' }),
      )
    })

    it('200 + code=20001 + body.msg 用 body.msg', async () => {
      mockSuccess(200, { code: 20001, msg: '步骤未完成' })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        msg: '步骤未完成',
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: '步骤未完成' }),
      )
    })

    it('500 服务端错误 toast 服务异常（覆盖 status>=500 分支）', async () => {
      mockSuccess(500, { code: 90001 })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        httpStatus: 500,
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: '服务异常，请稍后重试' }),
      )
    })

    it('403 非 2xx 非 401/429/500 按 body.msg toast', async () => {
      mockSuccess(403, { code: 10003, msg: 'forbidden' })
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        httpStatus: 403,
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'forbidden' }),
      )
    })

    it('非 2xx 且 body 无 code 时 code=-1 + 兜底文案', async () => {
      mockSuccess(403, {})
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        code: -1,
      })
    })
  })

  // ============================================================
  // 网络异常
  // ============================================================
  describe('网络异常', () => {
    it('fail 回调 → toast 网络异常 + reject ApiError(-1, 0)', async () => {
      mockFail()
      await expect(request({ url: '/api/test' })).rejects.toMatchObject({
        code: -1,
        httpStatus: 0,
        msg: '网络异常，请检查网络后重试',
      })
      expect(vi.mocked(uni.showToast)).toHaveBeenCalledWith(
        expect.objectContaining({ title: '网络异常，请检查网络后重试' }),
      )
    })
  })

  // ============================================================
  // URL 构建
  // ============================================================
  describe('URL 构建', () => {
    it('相对路径拼接 apiBase', async () => {
      mockSuccess(200, { code: 0, data: 1 })
      await request({ url: '/api/v1/test' })
      expect(lastCallOpts().url).toBe('http://localhost:8080/api/v1/test')
    })

    it('http 开头原样使用（不拼接 apiBase）', async () => {
      mockSuccess(200, { code: 0, data: 1 })
      await request({ url: 'https://other.com/api' })
      expect(lastCallOpts().url).toBe('https://other.com/api')
    })

    it('params 拼接为 query string', async () => {
      mockSuccess(200, { code: 0, data: 1 })
      await request({ url: '/api/test', params: { a: 1, b: 'x' } })
      const url = lastCallOpts().url
      expect(url).toContain('a=1')
      expect(url).toContain('b=x')
    })

    it('params 过滤 undefined/null/空串', async () => {
      mockSuccess(200, { code: 0, data: 1 })
      await request({
        url: '/api/test',
        params: { a: 1, b: undefined, c: null, d: '' },
      })
      const url = lastCallOpts().url
      expect(url).toContain('a=1')
      expect(url).not.toContain('b=')
      expect(url).not.toContain('c=')
      expect(url).not.toContain('d=')
    })
  })

  // ============================================================
  // http 便捷方法
  // ============================================================
  describe('http 便捷方法', () => {
    it('http.get 传入 method=GET', async () => {
      mockSuccess(200, { code: 0, data: 1 })
      await http.get('/api/test', { a: 1 })
      expect(lastCallOpts().method).toBe('GET')
    })

    it('http.post 传入 method=POST', async () => {
      mockSuccess(200, { code: 0, data: 1 })
      await http.post('/api/test', { a: 1 })
      expect(lastCallOpts().method).toBe('POST')
    })

    it('http.put 传入 method=PUT', async () => {
      mockSuccess(200, { code: 0, data: 1 })
      await http.put('/api/test', { a: 1 })
      expect(lastCallOpts().method).toBe('PUT')
    })

    it('http.del 传入 method=DELETE', async () => {
      mockSuccess(200, { code: 0, data: 1 })
      await http.del('/api/test')
      expect(lastCallOpts().method).toBe('DELETE')
    })
  })

  // ============================================================
  // ApiError 类型验证
  // ============================================================
  describe('reject 抛出 ApiError 实例', () => {
    it('业务码错误 reject 的是 ApiError 实例', async () => {
      mockSuccess(200, { code: 10001, msg: 'x' })
      await expect(request({ url: '/api/test' })).rejects.toBeInstanceOf(ApiError)
    })
  })
})
