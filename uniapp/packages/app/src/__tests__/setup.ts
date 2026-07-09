// Copyright (c) 2026 Declaro. All rights reserved.

import { afterEach, beforeEach, vi } from 'vitest'

/**
 * 全局测试 setup：stub globalThis.uni。
 *
 * 覆盖被测源码用到的全部 uni API：
 *   storage  -> getStorageSync / setStorageSync / removeStorageSync / getStorageInfoSync
 *   request  -> request / showToast / reLaunch
 *
 * storage 用 Map 实现，保证读写在测试内可见、可断言；
 * request/showToast/reLaunch 用空实现，由各测试用 vi.mocked(...) 自行配置返回。
 */

const mockStorage = new Map<string, unknown>()

const uniStub = {
  getStorageSync: vi.fn((key: string) => mockStorage.get(key) ?? ''),
  setStorageSync: vi.fn((key: string, val: unknown) => {
    mockStorage.set(key, val)
  }),
  removeStorageSync: vi.fn((key: string) => {
    mockStorage.delete(key)
  }),
  getStorageInfoSync: vi.fn(() => ({
    keys: Array.from(mockStorage.keys()),
    currentSize: 0,
    limitSize: 10240,
  })),
  request: vi.fn(),
  showToast: vi.fn(),
  reLaunch: vi.fn(),
}

vi.stubGlobal('uni', uniStub)

/** 暴露给测试用例直接操作底层 storage（用于断言写入结果） */
export const __mockStorage = mockStorage
/** 暴露 uni stub 引用，便于测试用 vi.mocked(uni.request).mockImplementation(...) 配置 */
export const __uniStub = uniStub

beforeEach(() => {
  mockStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})
