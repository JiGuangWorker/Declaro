// Copyright (c) 2026 Declaro. All rights reserved.

import { wxLogin } from '../../api/auth'
import { setAuth } from '../../api/request'
import { getToken, setToken, clearToken, isTokenValid } from '../../utils/storage'

// 对外保留 token 工具的统一出口（合并自 Issue #5 的 store/token.ts，已统一到 utils/storage）
export { getToken, clearToken, isTokenValid, setToken } from '../../utils/storage'

const MAX_RETRIES = 3
const RETRY_BASE_DELAY = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 静默登录：token 有效则跳过；否则 wx.login() 拿 code → 调后端换 token → 落地。
 * 失败按指数退避重试最多 3 次，全部失败后抛出最后一个错误（供调用方展示）。
 * 对齐 PRD §6（无登录态，wx.login 隐式获取）。
 *
 * 返回 true 表示登录成功；抛出 Error 表示全部重试耗尽。
 */
export async function silentLogin(): Promise<boolean> {
  // token 仍有效，无需重登
  if (isTokenValid()) {
    return true
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject })
      })

      if (!loginRes.code) {
        throw new Error('wx.login() 返回 code 为空')
      }

      // request 脱壳返回 data：成功（code=0）时 res 即 { session_token, expires_in }
      const res = await wxLogin({ code: loginRes.code })
      if (res?.session_token) {
        setToken(res.session_token, res.expires_in)
        return true
      }

      throw new Error('登录返回缺少 session_token')
    } catch (e) {
      lastError = e
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_BASE_DELAY * Math.pow(2, attempt))
      }
    }
  }

  // 全部重试耗尽，抛出最后一个错误供调用方展示
  throw lastError instanceof Error
    ? lastError
    : new Error('登录失败，请重试')
}

/**
 * token 续签：复用 silentLogin，失败清 token 并抛出。
 * 由 request.ts 的 401 队列重放机制调用。
 */
export async function refreshToken(): Promise<string> {
  try {
    await silentLogin()
  } catch {
    clearToken()
    throw new Error('Token 续签失败')
  }
  return getToken() || ''
}

// 注入到 request.ts 的 401 队列重放机制（打破循环依赖）
setAuth(silentLogin, refreshToken)
