// Copyright (c) 2026 Declaro. All rights reserved.

import { afterEach, describe, expect, it } from 'vitest'
import { uuidv4 } from '../../utils/uuid'

// RFC 4122 v4 正则：version 位 4，variant 位 8/9/a/b
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('uuidv4', () => {
  it('符合 RFC 4122 v4 格式', () => {
    for (let i = 0; i < 100; i++) {
      expect(uuidv4()).toMatch(UUID_V4_REGEX)
    }
  })

  it('version 位固定为 4（第三段首字符）', () => {
    for (let i = 0; i < 50; i++) {
      expect(uuidv4()[14]).toBe('4')
    }
  })

  it('variant 位固定为 8/9/a/b（第四段首字符）', () => {
    for (let i = 0; i < 50; i++) {
      expect(['8', '9', 'a', 'b']).toContain(uuidv4()[19])
    }
  })

  it('大量生成不重复', () => {
    const set = new Set<string>()
    for (let i = 0; i < 10000; i++) set.add(uuidv4())
    expect(set.size).toBe(10000)
  })

  it('crypto 不可用时回退到 Math.random 仍生成合法 v4', () => {
    const g = globalThis as { crypto?: unknown }
    const origCrypto = g.crypto
    try {
      // 删除 crypto 触发 Math.random 回退分支
      delete g.crypto
      const id = uuidv4()
      expect(id).toMatch(UUID_V4_REGEX)
      expect(id[14]).toBe('4')
    } finally {
      if (origCrypto !== undefined) g.crypto = origCrypto
    }
  })

  afterEach(() => {
    // 确保 crypto 恢复，不污染后续测试
    expect(globalThis.crypto).toBeDefined()
  })
})
