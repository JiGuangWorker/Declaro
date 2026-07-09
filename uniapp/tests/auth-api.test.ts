import { describe, it, expect, vi } from 'vitest'

vi.mock('../packages/app/src/api/request', () => ({
  request: vi.fn(),
  setAuth: vi.fn(),
}))

import { wxLogin } from '../packages/app/src/api/auth'
import { request } from '../packages/app/src/api/request'

describe('auth API', () => {
  it('调用 POST /api/v1/auth/wx-login 且 skipAuth', async () => {
    // request 脱壳返回 data（成功时即 { session_token, expires_in }）
    vi.mocked(request).mockResolvedValue({
      session_token: 't',
      expires_in: 7200,
    })

    await wxLogin({ code: 'test_code' })

    expect(request).toHaveBeenCalledWith({
      url: '/api/v1/auth/wx-login',
      method: 'POST',
      data: { code: 'test_code' },
      skipAuth: true,
    })
  })
})
