// Copyright (c) 2026 Declaro. All rights reserved.

import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * config 模块在 import 时即计算 apiBase（顶层 const），
 * 故每个用例需 vi.resetModules + 动态 import 重新加载模块以读取 stubbed env。
 *
 * 注意：vi.stubEnv 设为空串时，`?? 'prod'` 不生效（空串非 nullish）。
 * 因此"无 VITE_API_MODE"场景必须在 beforeEach delete 该属性，让其保持 undefined。
 */
describe('config（apiBase 三级回退）', () => {
  beforeEach(() => {
    vi.resetModules()
    // 清理 VITE_* 环境变量 stub，避免跨测试污染
    const env = import.meta.env as Record<string, unknown>
    delete env.VITE_API_BASE
    delete env.VITE_API_MODE
  })

  it('development 模式默认用 dev base', async () => {
    vi.stubEnv('MODE', 'development')
    // VITE_API_BASE / VITE_API_MODE 保持 undefined → 走 dev 兜底
    const { apiBase, mode, requestTimeout } = await import('../../config')
    expect(mode).toBe('development')
    expect(apiBase).toBe('http://localhost:8080')
    expect(requestTimeout).toBe(30000)
  })

  it('development + VITE_API_MODE=mock 用 mock base（.env.development 默认路径）', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_API_MODE', 'mock')
    const { apiBase } = await import('../../config')
    expect(apiBase).toBe('https://m1.apifoxmock.com/m1/8554967-8330741-default')
  })

  it('production 无 VITE_API_MODE → ?? "prod" 兜底用 prod base', async () => {
    vi.stubEnv('MODE', 'production')
    // VITE_API_MODE 保持 delete 后的 undefined → ?? 'prod' 生效
    const { apiBase } = await import('../../config')
    expect(apiBase).toBe('https://m1.apifoxmock.com/m1/8554967-8330741-default')
  })

  it('production + VITE_API_MODE=mock 用 mock base', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_API_MODE', 'mock')
    const { apiBase } = await import('../../config')
    expect(apiBase).toBe('https://m1.apifoxmock.com/m1/8554967-8330741-default')
  })

  it('VITE_API_BASE 优先级最高（覆盖 mode 与 VITE_API_MODE）', async () => {
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_API_BASE', 'https://custom.example.com')
    vi.stubEnv('VITE_API_MODE', 'mock')
    const { apiBase } = await import('../../config')
    expect(apiBase).toBe('https://custom.example.com')
  })
})
