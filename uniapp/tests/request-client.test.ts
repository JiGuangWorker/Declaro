import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockStorage } from './setup'

const uni = (globalThis as any).uni

import {
  request,
  setAuth,
  ApiEnvelope,
} from '../packages/app/src/api/request'

const mockSilentLogin = vi.fn()
const mockRefreshToken = vi.fn()

// 注入 auth 函数：注入后 401 走队列重放（enqueue401Retry），不再触发默认 unauthorizedHandler
setAuth(mockSilentLogin, mockRefreshToken)

function mockRequestResponse(statusCode: number, data: ApiEnvelope) {
  uni.request.mockImplementation((opts: any) => {
    opts.success({ statusCode, data })
  })
}

/** 写入一个有效 token（对齐 utils/storage 的 key 约定） */
function seedToken(token: string): void {
  mockStorage['declaro:auth:token'] = token
  mockStorage['declaro:auth:expires_at'] = String(Date.now() + 3600_000)
}

describe('request client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    mockSilentLogin.mockReset()
    mockRefreshToken.mockReset()
  })

  it('skipAuth 请求不附加 Authorization', async () => {
    mockRequestResponse(200, { code: 0, msg: 'ok' })

    await request({ url: '/test', skipAuth: true })

    const call = uni.request.mock.calls[0][0]
    expect(call.header.Authorization).toBeUndefined()
  })

  it('无 token 时不附加 Authorization', async () => {
    mockRequestResponse(200, { code: 0, msg: 'ok' })

    await request({ url: '/test' })

    const call = uni.request.mock.calls[0][0]
    expect(call.header.Authorization).toBeUndefined()
  })

  it('有 token 时自动附加 Bearer', async () => {
    seedToken('my_token')
    mockRequestResponse(200, { code: 0, msg: 'ok' })

    await request({ url: '/test' })

    const call = uni.request.mock.calls[0][0]
    expect(call.header.Authorization).toBe('Bearer my_token')
  })

  it('POST 请求自动生成 Idempotency-Key', async () => {
    mockRequestResponse(200, { code: 0, msg: 'ok' })

    await request({ url: '/test', method: 'POST', data: { a: 1 } })

    const call = uni.request.mock.calls[0][0]
    expect(call.header['Idempotency-Key']).toBeTruthy()
  })

  it('成功响应脱壳返回 data', async () => {
    mockRequestResponse(200, { code: 0, msg: 'ok', data: { id: 1 } })

    const res = await request<{ id: number }>({ url: '/test' })

    expect(res).toEqual({ id: 1 })
  })

  it('10002 token 过期触发续签并重放', async () => {
    seedToken('old_token')
    // 第一次返回 401+10002，续签成功后再返回 200
    let callCount = 0
    uni.request.mockImplementation((opts: any) => {
      callCount++
      if (callCount === 1) {
        opts.success({ statusCode: 401, data: { code: 10002, msg: 'expired' } })
      } else {
        opts.success({ statusCode: 200, data: { code: 0, msg: 'ok', data: 'result' } })
      }
    })
    mockRefreshToken.mockResolvedValue('new_token')

    // request 脱壳：成功时 resolve 出 data 本身
    const res = await request({ url: '/api/data' })

    expect(res).toBe('result')
    expect(mockRefreshToken).toHaveBeenCalledTimes(1)
  })

  it('续签失败时 reject', async () => {
    seedToken('old_token')
    uni.request.mockImplementation((opts: any) => {
      opts.success({ statusCode: 401, data: { code: 10002, msg: 'expired' } })
    })
    mockRefreshToken.mockRejectedValue(new Error('refresh failed'))

    await expect(request({ url: '/api/data' })).rejects.toThrow('refresh failed')
  })

  it('并发 401 只触发一次续签', async () => {
    seedToken('old_token')
    uni.request.mockImplementation((opts: any) => {
      opts.success({ statusCode: 401, data: { code: 10002, msg: 'expired' } })
    })
    // refreshToken 在首次调用后才 resolve
    let resolveRefresh: (v: string) => void
    const refreshPromise = new Promise<string>((r) => { resolveRefresh = r })
    mockRefreshToken.mockReturnValue(refreshPromise)

    const p1 = request({ url: '/api/a' })
    const p2 = request({ url: '/api/b' })

    resolveRefresh!('new_token')
    // 续签成功后，flush 重放会再调 request，需要返回成功
    uni.request.mockImplementation((opts: any) => {
      opts.success({ statusCode: 200, data: { code: 0, msg: 'ok' } })
    })

    await Promise.all([p1, p2])

    expect(mockRefreshToken).toHaveBeenCalledTimes(1)
  })

  it('10001 未授权触发重新静默登录', async () => {
    seedToken('refreshed')
    let callCount = 0
    uni.request.mockImplementation((opts: any) => {
      callCount++
      if (callCount === 1) {
        opts.success({ statusCode: 401, data: { code: 10001, msg: 'unauthorized' } })
      } else {
        opts.success({ statusCode: 200, data: { code: 0, msg: 'ok' } })
      }
    })
    mockSilentLogin.mockResolvedValue(true)

    await request({ url: '/api/data' })

    expect(mockSilentLogin).toHaveBeenCalledTimes(1)
  })

  it('重新登录失败时 reject', async () => {
    seedToken('old_token')
    uni.request.mockImplementation((opts: any) => {
      opts.success({ statusCode: 401, data: { code: 10001, msg: 'unauthorized' } })
    })
    mockSilentLogin.mockResolvedValue(false)

    await expect(request({ url: '/api/data' })).rejects.toThrow('重新登录失败')
  })

  it('429 限流提示 Retry-After 秒数', async () => {
    uni.request.mockImplementation((opts: any) => {
      opts.success({
        statusCode: 429,
        header: { 'Retry-After': '30' },
        data: { code: 0, msg: 'too many requests' },
      })
    })

    await expect(request({ url: '/api/data' })).rejects.toMatchObject({
      code: 0,
      httpStatus: 429,
      retryAfter: 30,
    })
    expect(uni.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('30') }),
    )
  })

  it('业务码非 0 时 reject 出 ApiError', async () => {
    mockRequestResponse(200, { code: 20001, msg: '步骤不存在' })

    await expect(request({ url: '/api/data' })).rejects.toMatchObject({
      code: 20001,
      msg: '步骤不存在',
      httpStatus: 200,
    })
  })

  it('网络层失败 reject 网络异常', async () => {
    uni.request.mockImplementation((opts: any) => {
      opts.fail({ errMsg: 'request:fail timeout' })
    })

    await expect(request({ url: '/api/data' })).rejects.toMatchObject({
      code: -1,
      httpStatus: 0,
    })
    expect(uni.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '网络异常，请检查网络后重试' }),
    )
  })
})
