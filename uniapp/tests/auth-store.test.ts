import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../packages/app/src/api/auth', () => ({
  wxLogin: vi.fn(),
}))

vi.mock('../packages/app/src/api/request', () => ({
  setAuth: vi.fn(),
  request: vi.fn(),
}))

import { wxLogin } from '../packages/app/src/api/auth'
import { silentLogin, refreshToken } from '../packages/app/src/store/modules/auth'
import { setToken } from '../packages/app/src/utils/storage'
import { mockStorage } from './setup'

const uni = (globalThis as any).uni

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  describe('silentLogin', () => {
    it('token 有效时直接返回 true', async () => {
      // 设置未过期 token（expires_at 在未来，超过 30s 缓冲）
      setToken('valid_token', 3600)
      const result = await silentLogin()
      expect(result).toBe(true)
      expect(uni.login).not.toHaveBeenCalled()
    })

    it('wx.login 成功后调 API 换 token', async () => {
      uni.login.mockImplementation((opts: any) => {
        opts.success({ code: 'wx_code_123' })
      })
      // request 脱壳返回 data
      vi.mocked(wxLogin).mockResolvedValue({
        session_token: 'new_token',
        expires_in: 7200,
      })

      const result = await silentLogin()

      expect(result).toBe(true)
      expect(uni.login).toHaveBeenCalledWith(expect.objectContaining({ provider: 'weixin' }))
      expect(wxLogin).toHaveBeenCalledWith({ code: 'wx_code_123' })
    })

    it('wx.login 返回空 code 则重试 3 次后失败', async () => {
      uni.login.mockImplementation((opts: any) => {
        opts.success({ code: '' })
      })

      const result = await silentLogin()

      expect(result).toBe(false)
      expect(uni.login).toHaveBeenCalledTimes(3)
    })

    it('API 失败重试 3 次', async () => {
      uni.login.mockImplementation((opts: any) => {
        opts.success({ code: 'wx_code_123' })
      })
      vi.mocked(wxLogin).mockRejectedValue(new Error('Network error'))

      const result = await silentLogin()

      expect(result).toBe(false)
      expect(wxLogin).toHaveBeenCalledTimes(3)
    })

    it('wx.login 失败后第 3 次成功', async () => {
      let calls = 0
      uni.login.mockImplementation((opts: any) => {
        calls++
        if (calls === 3) {
          opts.success({ code: 'code_ok' })
        } else {
          opts.fail({ errMsg: 'login:fail' })
        }
      })
      vi.mocked(wxLogin).mockResolvedValue({
        session_token: 'tk',
        expires_in: 7200,
      })

      const result = await silentLogin()

      expect(result).toBe(true)
      expect(uni.login).toHaveBeenCalledTimes(3)
    })
  })

  describe('refreshToken', () => {
    it('续签成功返回新 token', async () => {
      uni.login.mockImplementation((opts: any) => {
        opts.success({ code: 'code_refresh' })
      })
      vi.mocked(wxLogin).mockResolvedValue({
        session_token: 'refreshed_token',
        expires_in: 7200,
      })

      const token = await refreshToken()
      expect(token).toBe('refreshed_token')
    })

    it('续签失败抛异常', async () => {
      uni.login.mockImplementation((opts: any) => {
        opts.success({ code: '' })
      })

      await expect(refreshToken()).rejects.toThrow('Token 续签失败')
    })
  })
})
