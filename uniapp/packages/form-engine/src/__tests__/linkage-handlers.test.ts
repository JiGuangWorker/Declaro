// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, it, expect } from 'vitest'
import { evalCondition, evalConditions, isEmpty } from '../linkage/condition'
import { createHandlerRegistry } from '../linkage/registry'
import { registerBuiltins, conditionalVisibilityHandler, conditionalRequiredHandler } from '../linkage/handlers'
import type { LinkageHandler, HandlerContext } from '../linkage/types'
import type { Condition } from '../types/engine'
import { DataStore } from '../data-store'

// ─── 辅助工厂 ───

function makeCtx(opts: Partial<HandlerContext> & { stepId?: string }): HandlerContext {
  const ds = opts.dataStore ?? new DataStore()
  return {
    signal: opts.signal ?? { type: 'change', fieldPath: 'a', payload: 'val' },
    dataStore: ds,
    stepId: opts.stepId ?? 'step1',
    params: opts.params,
    target: opts.target ?? 'target_field',
  }
}

function makeGetValue(map: Record<string, unknown>): (field: string) => unknown {
  return (field: string) => map[field]
}

// ─── #26 eval Condition 各 op ───

describe('linkage-handlers — evalCondition 8 ops', () => {
  it('eq / neq', () => {
    const gv = makeGetValue({ status: 'active', count: 5 })
    expect(evalCondition({ field: 'status', op: 'eq', value: 'active' }, gv)).toBe(true)
    expect(evalCondition({ field: 'status', op: 'eq', value: 'inactive' }, gv)).toBe(false)
    expect(evalCondition({ field: 'status', op: 'neq', value: 'inactive' }, gv)).toBe(true)
    expect(evalCondition({ field: 'status', op: 'neq', value: 'active' }, gv)).toBe(false)
  })

  it('in / not_in', () => {
    const gv = makeGetValue({ tag: 'B', n: 3 })
    expect(evalCondition({ field: 'tag', op: 'in', value: ['A', 'B', 'C'] }, gv)).toBe(true)
    expect(evalCondition({ field: 'tag', op: 'in', value: ['X', 'Y'] }, gv)).toBe(false)
    expect(evalCondition({ field: 'tag', op: 'not_in', value: ['X', 'Y'] }, gv)).toBe(true)
    expect(evalCondition({ field: 'tag', op: 'not_in', value: ['A', 'B'] }, gv)).toBe(false)
  })

  it('gt / lt', () => {
    const gv = makeGetValue({ count: 10 })
    expect(evalCondition({ field: 'count', op: 'gt', value: 5 }, gv)).toBe(true)
    expect(evalCondition({ field: 'count', op: 'gt', value: 10 }, gv)).toBe(false)
    expect(evalCondition({ field: 'count', op: 'lt', value: 20 }, gv)).toBe(true)
    expect(evalCondition({ field: 'count', op: 'lt', value: 10 }, gv)).toBe(false)
  })

  it('empty / not_empty', () => {
    const gv = makeGetValue({ s: '', arr: [], obj: {}, str: 'x', n: 0 })
    expect(evalCondition({ field: 's', op: 'empty' }, gv)).toBe(true)
    expect(evalCondition({ field: 'arr', op: 'empty' }, gv)).toBe(true)
    expect(evalCondition({ field: 'obj', op: 'empty' }, gv)).toBe(true)
    expect(evalCondition({ field: 's', op: 'not_empty' }, gv)).toBe(false)
    expect(evalCondition({ field: 'str', op: 'not_empty' }, gv)).toBe(true)
    // 0 不算空（区分未填与填了0）
    expect(evalCondition({ field: 'n', op: 'not_empty' }, gv)).toBe(true)
  })

  it('evalConditions AND 语义', () => {
    const gv = makeGetValue({ a: 'x', b: 5 })
    const conds: Condition[] = [
      { field: 'a', op: 'eq', value: 'x' },
      { field: 'b', op: 'gt', value: 3 },
    ]
    expect(evalConditions(conds, gv)).toBe(true)
    conds[1].value = 10
    expect(evalConditions(conds, gv)).toBe(false)
    // 空数组 → false（无条件不触发）
    expect(evalConditions([], gv)).toBe(false)
  })

  it('isEmpty 边界', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty('')).toBe(true)
    expect(isEmpty([])).toBe(true)
    expect(isEmpty({})).toBe(true)
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty(false)).toBe(false)
    expect(isEmpty('x')).toBe(false)
    expect(isEmpty([1])).toBe(false)
  })
})

// ─── #27 conditional-visibility ───

describe('linkage-handlers — conditional-visibility', () => {
  it('#27 when 成立 → set-visibility=true；不成立 → false', () => {
    const ds = new DataStore()
    ds.initStep('step1', { entity_type: 'company' })

    const conds: Condition[] = [{ field: 'entity_type', op: 'eq', value: 'company' }]
    const ctxTrue = makeCtx({ dataStore: ds, params: conds, target: 'sec_branches' })
    const effectsTrue = conditionalVisibilityHandler.apply(ctxTrue)
    expect(effectsTrue).toEqual([{ type: 'set-visibility', target: 'sec_branches', payload: { visible: true } }])

    ds.write('step1', 'entity_type', 'individual')
    const ctxFalse = makeCtx({ dataStore: ds, params: conds, target: 'sec_branches' })
    const effectsFalse = conditionalVisibilityHandler.apply(ctxFalse)
    expect(effectsFalse).toEqual([{ type: 'set-visibility', target: 'sec_branches', payload: { visible: false } }])
  })
})

// ─── #28 conditional-required ───

describe('linkage-handlers — conditional-required', () => {
  it('#28 when 成立 → set-required=true', () => {
    const ds = new DataStore()
    ds.initStep('step1', { channels: ['online'] })

    const conds: Condition[] = [{ field: 'channels', op: 'not_empty' }]
    const ctx = makeCtx({ dataStore: ds, params: conds, target: 'phone' })
    const effects = conditionalRequiredHandler.apply(ctx)
    expect(effects).toEqual([{ type: 'set-required', target: 'phone', payload: { required: true } }])

    ds.write('step1', 'channels', [])
    const effectsFalse = conditionalRequiredHandler.apply(ctx)
    expect(effectsFalse).toEqual([{ type: 'set-required', target: 'phone', payload: { required: false } }])
  })
})

// ─── #29 registerBuiltins ───

describe('linkage-handlers — registerBuiltins', () => {
  it('#29 registry 含 conditional-visibility / conditional-required', () => {
    const registry = createHandlerRegistry()
    registerBuiltins(registry)
    expect(registry.has('conditional-visibility')).toBe(true)
    expect(registry.has('conditional-required')).toBe(true)
    expect(registry.get('conditional-visibility')?.name).toBe('conditional-visibility')
    expect(registry.get('conditional-required')?.name).toBe('conditional-required')
  })
})

// ─── #30 自定义 handler 扩展性证明 ───

describe('linkage-handlers — 自定义 handler 扩展性', () => {
  it('#30 register computed-field → 产 set-value', () => {
    const registry = createHandlerRegistry()
    registerBuiltins(registry)

    // 注册自定义处理器：读取信号字段值，套模板，产 set-value
    const computedFieldHandler: LinkageHandler = {
      name: 'computed-field',
      apply(ctx): ReturnType<LinkageHandler['apply']> {
        const params = ctx.params as { template: string }
        const sourceValue = String(ctx.dataStore.read(ctx.stepId, ctx.signal.fieldPath) ?? '')
        const value = params.template.replace('{{' + ctx.signal.fieldPath + '}}', sourceValue)
        return [{ type: 'set-value', target: ctx.target, payload: { value } }]
      },
    }
    registry.register(computedFieldHandler)
    expect(registry.has('computed-field')).toBe(true)

    // 验证：a 改值 → computed-field 处理器产 set-value 到 b
    const ds = new DataStore()
    ds.initStep('step1', { a: 'hello', b: '' })
    const handler = registry.get('computed-field')!
    const ctx = makeCtx({
      dataStore: ds,
      signal: { type: 'change', fieldPath: 'a', payload: 'hello' },
      params: { template: 'B={{a}}' },
      target: 'b',
    })
    const effects = handler.apply(ctx)
    expect(effects).toEqual([{ type: 'set-value', target: 'b', payload: { value: 'B=hello' } }])
  })
})

// ─── #31 未知 handler 静默跳过 ───

describe('linkage-handlers — 未知 handler', () => {
  it('#31 registry.get(未注册) → undefined（SignalRouter 静默跳过不崩）', () => {
    const registry = createHandlerRegistry()
    registerBuiltins(registry)
    expect(registry.get('nonexistent-handler')).toBeUndefined()
    expect(registry.has('nonexistent-handler')).toBe(false)
  })
})

// ─── #32 handler.apply 纯函数 ───

describe('linkage-handlers — handler.apply 纯函数', () => {
  it('#32 同 signal + D 必产同 Effect[]', () => {
    const ds = new DataStore()
    ds.initStep('step1', { entity_type: 'company' })
    const conds: Condition[] = [{ field: 'entity_type', op: 'eq', value: 'company' }]

    const ctx1 = makeCtx({ dataStore: ds, params: conds, target: 'sec_branches' })
    const ctx2 = makeCtx({ dataStore: ds, params: conds, target: 'sec_branches' })

    const e1 = conditionalVisibilityHandler.apply(ctx1)
    const e2 = conditionalVisibilityHandler.apply(ctx2)
    expect(e1).toEqual(e2)
  })
})
