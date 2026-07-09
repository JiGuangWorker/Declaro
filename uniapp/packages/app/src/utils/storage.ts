// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * session_token 持久化工具。
 *
 * 对齐 openapi.yaml BearerAuth：业务接口通过 Authorization: Bearer <token> 携带。
 * token 存于 uni.setStorageSync，应用启动时校验有效期，过期则清除。
 */

const TOKEN_KEY = 'declaro:auth:token'
const EXPIRES_KEY = 'declaro:auth:expires_at'

export interface TokenInfo {
  token: string
  /** 过期时间戳（毫秒） */
  expiresAt: number
}

export function getToken(): string | null {
  return uni.getStorageSync(TOKEN_KEY) || null
}

export function getTokenInfo(): TokenInfo | null {
  const token = getToken()
  if (!token) return null
  const expiresAt = Number(uni.getStorageSync(EXPIRES_KEY)) || 0
  return { token, expiresAt }
}

export function setToken(token: string, expiresInSec: number): void {
  const expiresAt = Date.now() + expiresInSec * 1000
  uni.setStorageSync(TOKEN_KEY, token)
  uni.setStorageSync(EXPIRES_KEY, String(expiresAt))
}

export function clearToken(): void {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(EXPIRES_KEY)
}

/**
 * token 存在且未过期。
 * 预留 30s 提前量，避免临界态请求落到过期瞬间。
 */
export function isTokenValid(): boolean {
  const info = getTokenInfo()
  if (!info) return false
  return info.expiresAt - Date.now() > 30_000
}
