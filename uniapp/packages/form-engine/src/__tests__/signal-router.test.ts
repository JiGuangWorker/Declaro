// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, it, expect, vi } from 'vitest'
import {
  SignalRouter,
  createRenderState,
  validateFieldValue,
  isStepFormComplete,
  extractSubmitValues,
} from '../signal-router'
import { DataStore } from '../data-store'
import { createHandlerRegistry } from '../linkage/registry'
import { registerBuiltins } from '../linkage/handlers'
import { handlerRegistry } from '../linkage/registry'
import type { LinkageBinding, LinkageHandler, Effect } from '../linkage/types'
import type { LayoutNode, FieldSchema, RenderStep } from '../types/engine'
import type { InteractionSignal } from '../types/slots'
import { fullSchema, cascadeSchema, cycleSchema } from './fixtures'
import { readStep, extractFieldDefaults } from '../schema-reader'

// ─── 辅助工厂 ───

function makeSignal(fieldPath: string, payload: unknown): InteractionSignal {
  return { type: 'change', fieldPath, payload }
}

function setupRouter(opts?: {
  bindings?: LinkageBinding[]
  layout?: LayoutNode[]
  stepId?: string
}) {
  const ds = new DataStore()
  const reg = createHandlerRegistry()
  registerBuiltins(reg)
  const state = createRenderState()
  const router = new SignalRouter(ds, reg, state)
  const stepId = opts?.stepId ?? 'step1'
  const layout = opts?.layout ?? []
  ds.initStep(stepId, {})
  router.initStep(stepId, opts?.bindings ?? [], layout)
  return { ds, reg, state, router, stepId }
}

// computed-field handler（级联/循环测试用）
const computedFieldHandler: LinkageHandler = {
  name: 'computed-field',
  apply(ctx): Effect[] {
    const params = ctx.params as { template: string }
    const sourceValue = String(ctx.dataStore.read(ctx.stepId, ctx.signal.fieldPath) ?? '')
    const value = params.template.replace('{{' + ctx.signal.fieldPath + '}}', sourceValue)
    return [{ type: 'set-value', target: ctx.target, payload: { value } }]
  },
}

// ═══ A. 路由分发 (#13-17) ═══

describe('signal-router — A. 路由分发', () => {
  it('#13 emit change → match(on.field) 的 handler 收到', () => {
    const applySpy = vi.fn(() => [])
    const { reg, router } = setupRouter({
      bindings: [{ handler: 'spy', on: { field: 'a' }, target: 'b', params: null }],
    })
    reg.register({ name: 'spy', apply: applySpy })
    router.emit(makeSignal('a', 'val'))
    expect(applySpy).toHaveBeenCalledOnce()
  })

  it('#14 未 match 的 handler 不收到', () => {
    const applySpy = vi.fn(() => [])
    const { reg, router } = setupRouter({
      bindings: [{ handler: 'spy', on: { field: 'a' }, target: 'b', params: null }],
    })
    reg.register({ name: 'spy', apply: applySpy })
    router.emit(makeSignal('other_field', 'val'))
    expect(applySpy).not.toHaveBeenCalled()
  })

  it('#15 无 handler 注册 → emit 静默不崩', () => {
    const { router } = setupRouter({
      bindings: [{ handler: 'nonexistent', on: { field: 'a' }, target: 'b' }],
    })
    expect(() => router.emit(makeSignal('a', 'val'))).not.toThrow()
  })

  it('#16 register(handler) 后新信号可路由到它', () => {
    const applySpy = vi.fn(() => [])
    const { reg, router } = setupRouter({
      bindings: [{ handler: 'late', on: { field: 'x' }, target: 'y' }],
    })
    // 先 emit（handler 未注册 → 静默）
    router.emit(makeSignal('x', 'v1'))
    expect(applySpy).not.toHaveBeenCalled()
    // 注册后再 emit
    reg.register({ name: 'late', apply: applySpy })
    router.emit(makeSignal('x', 'v2'))
    expect(applySpy).toHaveBeenCalledOnce()
  })

  it('#17 多次 import 同一 Registry 单例', () => {
    // ES module 缓存保证单例
    expect(handlerRegistry).toBe(handlerRegistry)
  })
})

// ═══ B. applyEffects + 联动语义 (#18-25) ═══

describe('signal-router — B. applyEffects + 联动语义', () => {
  it('#18 set-visibility=false → 节点隐藏；含祖先传播', () => {
    const layout: LayoutNode[] = [
      { kind: 'section', id: 'sec1', title: 'S1', children: [
        { kind: 'field', ref: 'f1', id: 'f1' },
        { kind: 'row', id: 'row1', children: [
          { kind: 'field', ref: 'f2', id: 'f2' },
        ]},
      ]},
    ]
    const { router, state, reg, stepId } = setupRouter({ layout })

    // 注册一个条件隐藏 handler：payload='hide' 时隐藏，否则可见
    reg.register({
      name: 'hide-handler',
      apply: (ctx) => [{
        type: 'set-visibility',
        target: ctx.target,
        payload: { visible: ctx.signal.payload !== 'hide' },
      }],
    })
    router.initStep(stepId, [{ handler: 'hide-handler', on: { field: 'trigger' }, target: 'sec1' }], layout)

    // 初始：全部可见
    expect(router.isNodeVisible('sec1')).toBe(true)
    expect(router.isNodeVisible('f1')).toBe(true)
    expect(router.isNodeVisible('f2')).toBe(true)

    // 触发隐藏
    router.emit(makeSignal('trigger', 'hide'))

    // sec1 隐藏 → 子孙也隐藏（祖先传播）
    expect(state.visibility.get('sec1')).toBe(false)
    expect(router.isNodeVisible('sec1')).toBe(false)
    expect(router.isNodeVisible('f1')).toBe(false)
    expect(router.isNodeVisible('f2')).toBe(false)
  })

  it('#19 set-required / set-options / set-error / set-disabled 副作用契约', () => {
    const { router, state, reg, stepId } = setupRouter()

    // 注册一个产多种 effect 的 handler
    reg.register({
      name: 'multi-effect',
      apply: () => [
        { type: 'set-required', target: 'phone', payload: { required: true } },
        { type: 'set-options', target: 'region', payload: { options: [{ value: '1', label: 'A' }] } },
        { type: 'set-error', target: 'email', payload: { error: '格式错误' } },
        { type: 'set-disabled', target: 'submit', payload: { disabled: true } },
      ],
    })
    router.initStep(stepId, [{ handler: 'multi-effect', on: { field: 'trigger' }, target: '_' }], [])

    router.emit(makeSignal('trigger', 'go'))

    expect(state.required.get('phone')).toBe(true)
    expect(state.options.get('region')).toEqual([{ value: '1', label: 'A' }])
    expect(state.error.get('email')).toBe('格式错误')
    expect(state.disabled.get('submit')).toBe(true)
  })

  it('#20 set-value → 回写 DataStore 并重发 change（级联触发）', () => {
    const { router, ds, reg, stepId } = setupRouter()
    reg.register(computedFieldHandler)
    router.initStep(
      stepId,
      [{ handler: 'computed-field', on: { field: 'a' }, target: 'b', params: { template: 'B={{a}}' } }],
      [],
    )

    router.emit(makeSignal('a', 'hello'))
    // set-value 回写了 b
    expect(ds.read(stepId, 'b')).toBe('B=hello')
  })

  it('#21 级联收敛（A→B→停止）→ 不动点终止', () => {
    const { router, ds, reg, stepId } = setupRouter()
    reg.register(computedFieldHandler)
    router.initStep(
      stepId,
      [
        { handler: 'computed-field', on: { field: 'a' }, target: 'b', params: { template: 'B={{a}}' } },
        { handler: 'computed-field', on: { field: 'b' }, target: 'c', params: { template: 'C={{b}}' } },
      ],
      [],
    )

    router.emit(makeSignal('a', 'X'))
    // A→B→C 级联收敛
    expect(ds.read(stepId, 'b')).toBe('B=X')
    expect(ds.read(stepId, 'c')).toBe('C=B=X')
    // 不死循环
    expect(ds.read(stepId, 'a')).toBe('X')
  })

  it('#22 级联超 D_max 或 effect 序列重复 → halt + report', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // 循环：A→B→A→B→...
    const { router, reg, state, stepId } = setupRouter()
    reg.register(computedFieldHandler)
    router.initStep(
      stepId,
      [
        { handler: 'computed-field', on: { field: 'a' }, target: 'b', params: { template: 'B={{a}}' } },
        { handler: 'computed-field', on: { field: 'b' }, target: 'a', params: { template: 'A={{b}}' } },
      ],
      [],
    )

    router.emit(makeSignal('a', 'start'))

    // halt 发生
    expect(state.__linkageHalt).not.toBeNull()
    expect(state.__linkageHalt!.reason).toBe('cycle-detected')
    expect(state.__linkageHalt!.atDepth).toBeGreaterThan(0)
    expect(warnSpy).toHaveBeenCalledWith(
      '[FormEngine] linkage halt',
      expect.objectContaining({ reason: 'cycle-detected' }),
    )

    warnSpy.mockRestore()
  })

  it('#23 隐藏节点不参与 isStepFormComplete；隐藏/label 不进 extractSubmitValues', () => {
    const step: RenderStep = {
      id: 's1', name: 'test', renderType: 'form',
      fields: [
        { name: 'a', label: 'A', type: 'text', required: true },
        { name: 'b', label: 'B', type: 'text', required: true },
        { name: 'note', label: 'Note', type: 'label', required: false },
      ],
      layout: [
        { kind: 'field', ref: 'a', id: 'a' },
        { kind: 'section', id: 'sec_b', title: 'B', children: [{ kind: 'field', ref: 'b', id: 'b' }] },
        { kind: 'field', ref: 'note' },
      ],
    }
    const ds = new DataStore()
    ds.initStep('s1', { a: 'val_a', b: 'val_b' })
    const state = createRenderState()
    const reg = createHandlerRegistry()
    registerBuiltins(reg)
    const router = new SignalRouter(ds, reg, state)
    router.initStep('s1', [], step.layout!)

    // b 可见时 → complete
    expect(isStepFormComplete(step, ds, state, (f) => router.isFieldVisible(f))).toBe(true)

    // 隐藏 sec_b → b 不可见 → 不参与校验 → 仍 complete
    state.visibility.set('sec_b', false)
    expect(router.isFieldVisible('b')).toBe(false)
    expect(isStepFormComplete(step, ds, state, (f) => router.isFieldVisible(f))).toBe(true)

    // extractSubmitValues 不含隐藏字段和 label
    const submit = extractSubmitValues(step, ds, (f) => router.isFieldVisible(f))
    expect(submit['a']).toBe('val_a')
    expect(submit['b']).toBeUndefined() // 隐藏
    expect(submit['note']).toBeUndefined() // label
  })

  it('#24 validateFieldValue 参数化校验', () => {
    const state = createRenderState()
    const phoneField: FieldSchema = {
      name: 'phone', label: '电话', type: 'phone', required: true,
      validation: { pattern: '^1[3-9]\\d{9}$', min_length: 11, max_length: 11 },
    }
    const optField: FieldSchema = { name: 'opt', label: '可选', type: 'text', required: false }
    const labelField: FieldSchema = { name: 'note', label: '提示', type: 'label', required: false }
    const checkField: FieldSchema = { name: 'tags', label: '标签', type: 'checkbox', required: true }

    // required + 空
    expect(validateFieldValue(phoneField, '', state).ok).toBe(false)
    // required + 合法
    expect(validateFieldValue(phoneField, '13800138000', state).ok).toBe(true)
    // required + 格式不对
    expect(validateFieldValue(phoneField, '123', state).ok).toBe(false)
    // required + 长度不对
    expect(validateFieldValue(phoneField, '1380013800', state).ok).toBe(false)
    expect(validateFieldValue(phoneField, '138001380001', state).ok).toBe(false)
    // 非必填 + 空 → OK
    expect(validateFieldValue(optField, '', state).ok).toBe(true)
    // label → 永远 OK
    expect(validateFieldValue(labelField, '', state).ok).toBe(true)
    // checkbox required + 空数组
    expect(validateFieldValue(checkField, [], state).ok).toBe(false)
    // checkbox required + 非空数组
    expect(validateFieldValue(checkField, ['x'], state).ok).toBe(true)

    // 非法正则不抛
    const badPatternField: FieldSchema = {
      name: 'bad', label: 'Bad', type: 'text', required: false,
      validation: { pattern: '[' },
    }
    expect(() => validateFieldValue(badPatternField, 'val', state)).not.toThrow()
  })

  it('#25 isStepFormComplete 全必填已填合法→true；任一空→false', () => {
    const step: RenderStep = {
      id: 's1', name: 'test', renderType: 'form',
      fields: [
        { name: 'a', label: 'A', type: 'text', required: true },
        { name: 'b', label: 'B', type: 'text', required: true },
      ],
      layout: [{ kind: 'field', ref: 'a' }, { kind: 'field', ref: 'b' }],
    }
    const ds = new DataStore()
    const state = createRenderState()
    const reg = createHandlerRegistry()
    const router = new SignalRouter(ds, reg, state)
    router.initStep('s1', [], step.layout!)

    // 全空 → false
    ds.initStep('s1', { a: '', b: '' })
    expect(isStepFormComplete(step, ds, state, (f) => router.isFieldVisible(f))).toBe(false)

    // 填了 a → false（b 还空）
    ds.write('s1', 'a', 'val_a')
    expect(isStepFormComplete(step, ds, state, (f) => router.isFieldVisible(f))).toBe(false)

    // 全填 → true
    ds.write('s1', 'b', 'val_b')
    expect(isStepFormComplete(step, ds, state, (f) => router.isFieldVisible(f))).toBe(true)
  })
})

// ═══ 端到端联动验证（使用 fixtures）═══

describe('signal-router — 端到端联动', () => {
  it('fullSchema 条件可见联动', () => {
    const step = readStep(fullSchema.steps[0])
    const defaults = extractFieldDefaults(step)
    const ds = new DataStore()
    ds.initStep(step.id, defaults)
    const reg = createHandlerRegistry()
    registerBuiltins(reg)
    const state = createRenderState()
    const router = new SignalRouter(ds, reg, state)

    const bindings = fullSchema.steps[0].linkage ?? []
    router.initStep(step.id, bindings, step.layout!)

    // 初始 entity_type = '' → sec_branches 不可见
    expect(router.isNodeVisible('sec_branches')).toBe(false)

    // 改 entity_type = 'company' → 可见
    router.emit(makeSignal('entity_type', 'company'))
    expect(router.isNodeVisible('sec_branches')).toBe(true)

    // 改回 'individual' → 不可见
    router.emit(makeSignal('entity_type', 'individual'))
    expect(router.isNodeVisible('sec_branches')).toBe(false)
  })

  it('cascadeSchema A→B→C 收敛', () => {
    const step = readStep(cascadeSchema.steps[0])
    const ds = new DataStore()
    ds.initStep(step.id, { a: '', b: '', c: '' })
    const reg = createHandlerRegistry()
    registerBuiltins(reg)
    reg.register(computedFieldHandler)
    const state = createRenderState()
    const router = new SignalRouter(ds, reg, state)

    router.initStep(step.id, cascadeSchema.steps[0].linkage ?? [], step.layout!)
    router.emit(makeSignal('a', 'X'))

    expect(ds.read(step.id, 'b')).toBe('B=X')
    expect(ds.read(step.id, 'c')).toBe('C=B=X')
  })

  it('cycleSchema A→B→A halt', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const step = readStep(cycleSchema.steps[0])
    const ds = new DataStore()
    ds.initStep(step.id, { a: '', b: '' })
    const reg = createHandlerRegistry()
    registerBuiltins(reg)
    reg.register(computedFieldHandler)
    const state = createRenderState()
    const router = new SignalRouter(ds, reg, state)

    router.initStep(step.id, cycleSchema.steps[0].linkage ?? [], step.layout!)
    router.emit(makeSignal('a', 'start'))

    expect(state.__linkageHalt).not.toBeNull()
    expect(state.__linkageHalt!.reason).toBe('cycle-detected')
    warnSpy.mockRestore()
  })
})
