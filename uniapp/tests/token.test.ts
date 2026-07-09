import { describe, it, expect, beforeEach } from 'vitest'
import {
  getToken,
  saveToken,
  clearToken,
  isTokenExpired,
} from '../packages/app/src/store/token'
import { mockStorage } from './setup'

describe('token', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  })

  describe('getToken', () => {
    it('无 token 返回 null', () => {
      expect(getToken()).toBeNull()
    })

    it('空字符串返回 null', () => {
      mockStorage['declaro_session_token'] = ''
      expect(getToken()).toBeNull()
    })

    it('有效 token 返回字符串', () => {
      mockStorage['declaro_session_token'] = 'abc123'
      expect(getToken()).toBe('abc123')
    })
  })

  describe('saveToken', () => {
    it('保存 token 和过期时间', () => {
      saveToken('token_xyz', 3600)
      expect(mockStorage['declaro_session_token']).toBe('token_xyz')
      const expiresAt = mockStorage['declaro_token_expires_at'] as number
      expect(expiresAt).toBeGreaterThan(Date.now() + 3590 * 1000)
    })
  })

  describe('clearToken', () => {
    it('清除 token', () => {
      saveToken('token_xyz', 3600)
      clearToken()
      expect(mockStorage['declaro_session_token']).toBeUndefined()
      expect(mockStorage['declaro_token_expires_at']).toBeUndefined()
    })
  })

  describe('isTokenExpired', () => {
    it('无过期时间返回 true', () => {
      expect(isTokenExpired()).toBe(true)
    })

    it('已过期返回 true', () => {
      mockStorage['declaro_token_expires_at'] = Date.now() - 1000
      expect(isTokenExpired()).toBe(true)
    })

    it('未过期返回 false', () => {
      mockStorage['declaro_token_expires_at'] = Date.now() + 3600_000
      expect(isTokenExpired()).toBe(false)
    })

    it('60 秒缓冲区内视为过期', () => {
      mockStorage['declaro_token_expires_at'] = Date.now() + 30_000
      expect(isTokenExpired()).toBe(true)
    })
  })
})
