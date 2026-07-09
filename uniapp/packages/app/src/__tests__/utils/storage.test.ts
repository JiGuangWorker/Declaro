// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { __uniStub as uni } from '../setup'
import {
  clearToken,
  getToken,
  getTokenInfo,
  isTokenValid,
  setToken,
} from '../../utils/storage'

describe('storage token 工具', () => {
  describe('getToken / setToken / clearToken', () => {
    it('初始无 token 返回 null', () => {
      expect(getToken()).toBeNull()
    })

    it('setToken 后 getToken 可读', () => {
      setToken('abc123', 3600)
      expect(getToken()).toBe('abc123')
    })

    it('clearToken 后 getToken 返回 null', () => {
      setToken('abc123', 3600)
      clearToken()
      expect(getToken()).toBeNull()
    })

    it('setToken 写入 token 和 expires_at 两个 key', () => {
      setToken('t', 60)
      expect(vi.mocked(uni.setStorageSync)).toHaveBeenCalledWith(
        'declaro:auth:token',
        't',
      )
      expect(vi.mocked(uni.setStorageSync)).toHaveBeenCalledWith(
        'declaro:auth:expires_at',
        expect.any(String),
      )
    })

    it('clearToken 删除两个 key', () => {
      setToken('t', 60)
      vi.mocked(uni.removeStorageSync).mockClear()
      clearToken()
      expect(vi.mocked(uni.removeStorageSync)).toHaveBeenCalledWith(
        'declaro:auth:token',
      )
      expect(vi.mocked(uni.removeStorageSync)).toHaveBeenCalledWith(
        'declaro:auth:expires_at',
      )
    })
  })

  describe('getTokenInfo', () => {
    it('无 token 返回 null', () => {
      expect(getTokenInfo()).toBeNull()
    })

    it('有 token 返回 token + expiresAt', () => {
      setToken('tok', 3600)
      const info = getTokenInfo()
      expect(info).not.toBeNull()
      expect(info!.token).toBe('tok')
      expect(info!.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('isTokenValid（30s buffer）', () => {
    it('无 token 返回 false', () => {
      expect(isTokenValid()).toBe(false)
    })

    it('已过期返回 false', () => {
      setToken('tok', -100)
      expect(isTokenValid()).toBe(false)
    })

    it('临界态（剩余 <30s）返回 false', () => {
      setToken('tok', 20) // 20s 后过期，小于 30s buffer
      expect(isTokenValid()).toBe(false)
    })

    it('有效（剩余 >30s）返回 true', () => {
      setToken('tok', 3600)
      expect(isTokenValid()).toBe(true)
    })

    it('剩余 31s 仍有效（边界）', () => {
      setToken('tok', 31)
      expect(isTokenValid()).toBe(true)
    })
  })
})
