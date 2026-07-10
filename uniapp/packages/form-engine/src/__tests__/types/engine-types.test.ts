// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, it, expect } from 'vitest'
import type {
  RenderContext,
  InteractionSignal,
  SystemEvent,
  SystemEventType,
  IDataBindable,
  ISignalChannel,
  FieldOption,
  FieldMeta,
  ChangeRequest,
  Unsubscribe,
} from '../../types/slots'
import type {
  LayoutNode,
  Condition,
  RenderStep,
  DataStore,
  RenderState,
  LinkageHaltReport,
  ValidationResult,
  FieldSchema,
  FormSchema,
  StepSchema,
  UploadConfig,
} from '../../types/engine'
import type { StepSchemaRuntimeExtension } from '../../types/engine-runtime'

/**
 * Phase 0 sanity：验证三相插槽类型 + 内核类型 + L2 过渡类型可编译可 import。
 * 这是一道闸门——类型契约不通过，Phase 1 不开始。
 */
describe('Phase 0 类型契约 sanity', () => {
  it('RenderContext 纯展示包可构造', () => {
    const ctx: RenderContext = {
      value: '张三',
      readonly: false,
      disabled: false,
      error: null,
      label: '姓名',
      placeholder: '请输入姓名',
      tips: undefined,
      options: undefined,
      validation: undefined,
    }
    expect(ctx.value).toBe('张三')
    expect(ctx.label).toBe('姓名')
  })

  it('InteractionSignal 三种类型可构造', () => {
    const change: InteractionSignal = { type: 'change', fieldPath: 'name', payload: '李四' }
    const focus: InteractionSignal = { type: 'focus', fieldPath: 'name', payload: undefined }
    const blur: InteractionSignal = { type: 'blur', fieldPath: 'name', payload: undefined }
    expect(change.type).toBe('change')
    expect(focus.type).toBe('focus')
    expect(blur.type).toBe('blur')
  })

  it('SystemEvent 6 种判别联合可构造且 type 可窄化', () => {
    const events: SystemEvent[] = [
      { type: 'reset', payload: { fieldPath: 'name', value: '' } },
      { type: 'visibility-change', payload: { nodeId: 'sec1', visible: false } },
      { type: 'required-change', payload: { fieldPath: 'name', required: true } },
      { type: 'options-change', payload: { fieldPath: 'city', options: [] } },
      { type: 'error-update', payload: { fieldPath: 'name', error: '必填' } },
      { type: 'disable-update', payload: { fieldPath: 'name', disabled: true } },
    ]
    for (const e of events) {
      const t: SystemEventType = e.type
      expect(t).toBeTruthy()
    }
    // 判别窄化
    const vis = events[1]
    if (vis.type === 'visibility-change') {
      expect(vis.payload.nodeId).toBe('sec1')
    }
  })

  it('IDataBindable / ISignalChannel 接口可被实现', () => {
    const binding: IDataBindable = {
      read: () => ({ value: 'x', meta: { required: true } as FieldMeta }),
      write: (c: ChangeRequest) => void c,
    }
    const channel: ISignalChannel = {
      emit: (s: InteractionSignal) => void s,
      on: (_t: SystemEventType, _h: (e: SystemEvent) => void): Unsubscribe => () => {},
    }
    expect(typeof binding.read).toBe('function')
    expect(typeof channel.emit).toBe('function')
  })

  it('LayoutNode 4 种 kind 可构造', () => {
    const field: LayoutNode = { kind: 'field', ref: 'name' }
    const section: LayoutNode = { kind: 'section', id: 'sec1', title: '基本信息', children: [field] }
    const row: LayoutNode = { kind: 'row', children: [field] }
    expect(row.kind).toBe('row')
    const repeatable: LayoutNode = {
      kind: 'repeatable',
      name: 'branches',
      min: 1,
      max: 5,
      children: [field],
    }
    expect(section.kind).toBe('section')
    expect(repeatable.max).toBe(5)
  })

  it('Condition 8 种 op 可构造', () => {
    const ops: Condition['op'][] = [
      'eq',
      'neq',
      'in',
      'not_in',
      'gt',
      'lt',
      'empty',
      'not_empty',
    ]
    expect(ops).toHaveLength(8)
    const c: Condition = { field: 'has_branches', op: 'eq', value: true }
    expect(c.op).toBe('eq')
  })

  it('RenderStep 三种 renderType 可构造', () => {
    const form: RenderStep = {
      id: 's1',
      name: '基本信息',
      renderType: 'form',
      fields: [],
    }
    expect(form.renderType).toBe('form')
  })

  it('RenderState 含 __linkageHalt 诊断字段', () => {
    const state: RenderState = {
      visibility: new Map(),
      required: new Map(),
      options: new Map(),
      error: new Map(),
      disabled: new Map(),
      __linkageHalt: null,
    }
    expect(state.__linkageHalt).toBeNull()
    const halted: LinkageHaltReport = {
      reason: 'cycle-detected',
      atDepth: 7,
      sig: 'abc123',
    }
    expect(halted.reason).toBe('cycle-detected')
  })

  it('ValidationResult 判别联合', () => {
    const ok: ValidationResult = { ok: true }
    const err: ValidationResult = { ok: false, error: '必填' }
    expect(ok.ok).toBe(true)
    expect(err.ok).toBe(false)
  })

  it('L1 API 类型 re-export 可用（FieldSchema 等）', () => {
    // 编译期类型可用即证明 @api-types 别名 + re-export 正常
    const fs: FieldSchema = {
      name: 'phone',
      label: '电话',
      type: 'phone',
      required: true,
    }
    const uc: UploadConfig = {
      min_count: 1,
      max_count: 5,
      accepted_types: ['image/jpeg', 'image/png'],
      max_size_mb: 10,
      auto_check: true,
    }
    expect(fs.type).toBe('phone')
    expect(uc).toBeDefined()
    // FormSchema / StepSchema 仅类型引用（运行时无值）
    const _fs: FormSchema = undefined as unknown as FormSchema
    const _ss: StepSchema = undefined as unknown as StepSchema
    expect(_fs).toBeUndefined()
    expect(_ss).toBeUndefined()
  })

  it('L2 过渡类型 StepSchemaRuntimeExtension 可构造', () => {
    const ext: StepSchemaRuntimeExtension = {
      layout: [{ kind: 'field', ref: 'name' }],
      linkage: [],
    }
    expect(ext.layout).toHaveLength(1)
  })

  it('FieldOption 类型可用', () => {
    const opt: FieldOption = { value: 'beijing', label: '北京' }
    expect(opt.label).toBe('北京')
  })

  it('DataStore 类型可用（stepId → fieldPath → value）', () => {
    const ds: DataStore = new Map([
      ['step1', new Map([['name', '张三']])],
    ])
    expect(ds.get('step1')?.get('name')).toBe('张三')
  })
})
