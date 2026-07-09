import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockStorage } from './setup'

const uni = (globalThis as any).uni

import {
  request,
  setAuth,
  ApiResponse,
} from '../packages/app/src/api/request'

const mockSilentLogin = vi.fn()
const mockRefreshToken = vi.fn()

// 注册 mock 的 auth 函数
setAuth(mockSilentLogin, mockRefreshToken)

function mockRequestResponse(statusCode: number, data: ApiResponse) {
  uni.request.mockImplementation((opts: any) => {
    opts.success({ statusCode, data })
  })
}

describe('request client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
    mockSilentLogin.mockReset()
    mockRefreshToken.mockReset()
  })

  it('noAuth 请求不附加 Authorization', async () => {
    mockRequestResponse(200, { code: 0, msg: 'ok' })

    await request({ url: '/test', noAuth: true })

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
    mockStorage['declaro_session_token'] = 'my_token'
    mockRequestResponse(200, { code: 0, msg: 'ok' })

    await request({ url: '/test' })

    const call = uni.request.mock.calls[0][0]
    expect(call.header.Authorization).toBe('Bearer my_token')
  })

  it('10002 token 过期触发静默续签并重放', async () => {
    mockStorage['declaro_session_token'] = 'old_token'
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

    const res = await request({ url: '/api/data' })

    expect(res.data).toBe('result')
    expect(mockRefreshToken).toHaveBeenCalledTimes(1)
  })

  it('续签失败时 reject', async () => {
    uni.request.mockImplementation((opts: any) => {
      opts.success({ statusCode: 401, data: { code: 10002, msg: 'expired' } })
    })
    mockRefreshToken.mockRejectedValue(new Error('refresh failed'))

    await expect(request({ url: '/api/data' })).rejects.toThrow('refresh failed')
  })

  it('并发 401 只触发一次续签', async () => {
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
    mockStorage['declaro_session_token'] = 'refreshed'
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
    uni.request.mockImplementation((opts: any) => {
      opts.success({ statusCode: 401, data: { code: 10001, msg: 'unauthorized' } })
    })
    mockSilentLogin.mockResolvedValue(false)

    await expect(request({ url: '/api/data' })).rejects.toThrow('重新登录失败')
  })
})
