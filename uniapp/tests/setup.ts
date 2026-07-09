import { vi } from 'vitest'

export const mockStorage: Record<string, any> = {}

;(globalThis as any).uni = {
  getStorageSync: vi.fn((key: string) => mockStorage[key]),
  setStorageSync: vi.fn((key: string, value: any) => {
    mockStorage[key] = value
  }),
  removeStorageSync: vi.fn((key: string) => {
    delete mockStorage[key]
  }),
  getStorageInfoSync: vi.fn(() => ({ keys: Object.keys(mockStorage), currentSize: 0, limitSize: 10240 })),
  login: vi.fn(),
  request: vi.fn(),
  reLaunch: vi.fn(),
  showToast: vi.fn(),
}

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
  vi.clearAllMocks()
})
