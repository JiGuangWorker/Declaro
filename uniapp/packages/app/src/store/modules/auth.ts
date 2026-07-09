// Copyright (c) 2026 Declaro. All rights reserved.

import { wxLogin } from '../../api/auth'
import { setAuth } from '../../api/request'
import { getToken, saveToken, clearToken, isTokenExpired } from '../token'

export { getToken, clearToken, isTokenExpired } from '../token'

const MAX_RETRIES = 3
const RETRY_BASE_DELAY = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function silentLogin(): Promise<boolean> {
  if (!isTokenExpired()) {
    return true
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject })
      })

      if (!loginRes.code) {
        throw new Error('wx.login() 返回 code 为空')
      }

      const res = await wxLogin({ code: loginRes.code })

      if (res.code === 0 && res.data?.session_token) {
        saveToken(res.data.session_token, res.data.expires_in)
        return true
      }

      throw new Error(res.msg || '登录失败')
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_BASE_DELAY * Math.pow(2, attempt))
      }
    }
  }

  return false
}

export async function refreshToken(): Promise<string> {
  const success = await silentLogin()
  if (!success) {
    clearToken()
    throw new Error('Token 续签失败')
  }
  return getToken() || ''
}

// 注入到 request.ts，打破循环依赖
setAuth(silentLogin, refreshToken)
