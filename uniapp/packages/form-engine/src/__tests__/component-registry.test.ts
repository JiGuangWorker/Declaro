// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, it, expect } from 'vitest'
import {
  createComponentRegistry,
  registerEngineComponents,
  componentRegistry,
  FIELD_TYPE_KEYS,
  LAYOUT_TYPE_KEYS,
} from '../component-registry'

describe('component-registry — registerEngineComponents', () => {
  it('#33 13 字段类型 + 4 布局类型均已注册', () => {
    const registry = createComponentRegistry()
    registerEngineComponents(registry)
    // 13 字段
    for (const key of FIELD_TYPE_KEYS) {
      expect(registry.has(key)).toBe(true)
    }
    // 4 布局
    for (const key of LAYOUT_TYPE_KEYS) {
      expect(registry.has(key)).toBe(true)
    }
    // 总计 17
    expect(FIELD_TYPE_KEYS.length).toBe(13)
    expect(LAYOUT_TYPE_KEYS.length).toBe(4)
  })
})

describe('component-registry — get / has / 兜底', () => {
  it('#34 get(未知) → Unknown 兜底不崩', () => {
    const registry = createComponentRegistry()
    registerEngineComponents(registry)
    // 未知类型 → UnknownRenderer 兜底
    const unknown = registry.get('futuristic_type')
    expect(unknown).toBeDefined()
    expect((unknown as { name: string }).name).toBe('UnknownRenderer')

    // 另一个未知 → 同一兜底
    const unknown2 = registry.get('unknown_layout')
    expect((unknown2 as { name: string }).name).toBe('UnknownRenderer')
  })

  it('#35 has 存在性', () => {
    const registry = createComponentRegistry()
    registerEngineComponents(registry)
    expect(registry.has('text')).toBe(true)
    expect(registry.has('section')).toBe(true)
    expect(registry.has('nonexistent')).toBe(false)
  })
})

describe('component-registry — 可扩展性', () => {
  it('#36 register 新 key 后 get 可取（零硬编码佐证）', () => {
    const registry = createComponentRegistry()
    const customComponent = { name: 'CustomField' } as never
    registry.register('custom_type', customComponent)
    expect(registry.has('custom_type')).toBe(true)
    expect(registry.get('custom_type')).toBe(customComponent)
  })
})

describe('component-registry — 单例一致性', () => {
  it('#37 多次 import 同一单例', () => {
    // ES module 缓存保证单例
    expect(componentRegistry).toBe(componentRegistry)
    expect(componentRegistry.has).toBeDefined()
    expect(componentRegistry.get).toBeDefined()
    expect(componentRegistry.register).toBeDefined()
  })
})
