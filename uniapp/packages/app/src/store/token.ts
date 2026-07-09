// Copyright (c) 2026 Declaro. All rights reserved.

const TOKEN_KEY = 'declaro_session_token'
const TOKEN_EXPIRES_KEY = 'declaro_token_expires_at'

export function getToken(): string | null {
  try {
    const token = uni.getStorageSync(TOKEN_KEY)
    return typeof token === 'string' && token ? token : null
  } catch {
    return null
  }
}

export function saveToken(token: string, expiresIn: number): void {
  uni.setStorageSync(TOKEN_KEY, token)
  uni.setStorageSync(TOKEN_EXPIRES_KEY, Date.now() + expiresIn * 1000)
}

export function clearToken(): void {
  try {
    uni.removeStorageSync(TOKEN_KEY)
    uni.removeStorageSync(TOKEN_EXPIRES_KEY)
  } catch {
    // ignore
  }
}

export function isTokenExpired(): boolean {
  try {
    const expiresAt = uni.getStorageSync(TOKEN_EXPIRES_KEY) as number | undefined
    if (!expiresAt || typeof expiresAt !== 'number') return true
    return Date.now() >= expiresAt - 60000
  } catch {
    return true
  }
}
