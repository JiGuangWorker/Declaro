// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * L4 平台内核类型（组件不可见，ESLint 拦截 fields/layouts import）。
 *
 * 内核私有实现类型。组件只接触 types/slots.ts 的三相插槽契约。
 * 注：Effect / LinkageHandler / LinkageBinding 属联动域，归 linkage/types.ts
 * （同属 L4，ESLint `../linkage/*` 同样拦截）。
 *
 * 详见设计文档 §2 Schema 接线图、§3 平台内核、§5 提交与校验语义。
 */

import type { components } from '@api-types'

// ─── L1 API 类型 re-export（不手写 13 联合）───

export type FieldSchema = components['schemas']['FieldSchema']
export type StepSchema = components['schemas']['StepSchema']
export type FormSchema = components['schemas']['FormSchema']
export type UploadConfig = components['schemas']['UploadConfig']

/** 13 种叶子字段类型（openapi 已定义，不扩） */
export type FieldType = FieldSchema['type']

// ─── §2.2 LayoutNode（布局拓扑接线）───

export type LayoutNodeKind = 'field' | 'section' | 'row' | 'repeatable'

export interface LayoutNode {
  kind: LayoutNodeKind
  /** 节点唯一标识；visibility-change 事件的 target 用它。无 id 的节点无法被联动隐藏 */
  id?: string
  /** kind=field 时必填：引用 FieldSchema.name，接线到数据模型槽 */
  ref?: string
  /** kind=section 时可选：分节标题 */
  title?: string
  /** section/row/repeatable 时必填：子节点 */
  children?: LayoutNode[]
  /** kind=repeatable 时必填：子表字段路径，DataStore 里行数组的 key */
  name?: string
  /** repeatable 时可选：最少行数，默认 1 */
  min?: number
  /** repeatable 时可选：最多行数，默认 99 */
  max?: number
}

// ─── §2.4 Condition（内置处理器的 params 解析，非引擎核心概念）───

export type ConditionOp =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'lt'
  | 'empty'
  | 'not_empty'

export interface Condition {
  /** 被判断的字段名，仅限同步骤内 */
  field: string
  op: ConditionOp
  /** op 非 empty/not_empty 时必填；boolean 用于 checkbox 字段条件判断 */
  value?: string | number | boolean | (string | number)[]
}

// ─── RenderStep（schema-reader 输出）───

export type StepRenderType = 'form' | 'upload' | 'both'

export interface RenderStep {
  id: string
  name: string
  renderType: StepRenderType
  tips?: string
  exampleImageUrl?: string
  /** form/both 时有值 */
  fields: FieldSchema[]
  /** 可选布局拓扑接线；未配 → 退化为 flatten(fields) */
  layout?: LayoutNode[]
  /** upload/both 时有值 */
  uploadConfig?: UploadConfig
}

// ─── §3.1 DataStore（数据存储）───

/**
 * 扁平键值存储。
 * repeatable 子表：整表存为一个 key（= LayoutNode.name），value = 行对象数组。
 * 行内子字段寻址见设计 §3.1.1 fieldPath 规约（<name>[<index>].<subField>）。
 */
export type DataStore = Map<string, Map<string, unknown>>

// ─── §3.3 LinkageHaltReport（不动点兜底诊断）───

export interface LinkageHaltReport {
  reason: 'depth-exceeded' | 'cycle-detected'
  atDepth: number
  /** 触发 halt 的 effect 序列规范化签名 */
  sig: string
}

// ─── §3.5 RenderState（渲染状态，内核维护，组件不可见）───

export interface RenderState {
  /** key = layout node id；未列入 = 可见 */
  visibility: Map<string, boolean>
  /** key = fieldPath；未列入 = 用 FieldSchema.required */
  required: Map<string, boolean>
  /** key = fieldPath；未列入 = 用 FieldSchema.options */
  options: Map<string, import('./slots').FieldOption[]>
  /** key = fieldPath；未列入 = 无错误 */
  error: Map<string, string | null>
  /** key = fieldPath；未列入 = 可编辑 */
  disabled: Map<string, boolean>
  /** 不动点兜底诊断；不投影进 RenderContext，仅供测试/FormRenderer 诊断 */
  __linkageHalt: LinkageHaltReport | null
}

// ─── §5.3 ValidationResult（校验结果）───

export type ValidationResult = { ok: true } | { ok: false; error: string }
