// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * schema-reader — 纯函数：将 raw schema 读取为引擎可消费的 RenderStep。
 *
 * 职责：
 * - readFormSchema / readStep：透传 + 归一化（type → renderType）
 * - flatten：无 layout 时合成扁平 field 节点树（向后兼容）
 * - extractFieldDefaults：初始化 DataStore 默认值（区分顶层字段与 repeatable 整表）
 *
 * 不含联动逻辑（C7：纯读取）。详见设计 §4.1 渲染流程、§5.1 extractFieldDefaults。
 */
import type { FieldSchema } from './types/engine'
import type { LayoutNode, RenderStep, StepRenderType } from './types/engine'
import type { LinkageBinding } from './linkage/types'
import type { RuntimeStep, RuntimeFormSchema } from './types/engine-runtime'

// ─── readFormSchema ───

export function readFormSchema(schema: RuntimeFormSchema): {
  template_id: string
  version: string
  steps: RenderStep[]
} {
  return {
    template_id: schema.template_id,
    version: schema.version,
    steps: (schema.steps ?? []).map(readStep),
  }
}

// ─── readStep ───

export function readStep(step: RuntimeStep): RenderStep {
  const renderType = step.type as StepRenderType
  const fields = step.type === 'upload' ? [] : (step.fields ?? [])
  const layout = step.layout ?? flatten(fields)

  return {
    id: step.id,
    name: step.name,
    renderType,
    tips: step.tips,
    exampleImageUrl: step.example_image_url,
    fields,
    layout,
    uploadConfig: step.upload_config,
  }
}

// ─── flatten：无 layout 时合成扁平 field 节点 ───

export function flatten(fields: FieldSchema[]): LayoutNode[] {
  return fields.map((f) => ({ kind: 'field' as const, ref: f.name }))
}

// ─── extractLinkage：提取联动声明（供 SignalRouter 使用）───

export function extractLinkage(step: RuntimeStep): LinkageBinding[] {
  return step.linkage ?? []
}

// ─── extractFieldDefaults：初始化 DataStore ───

/**
 * 区分顶层字段与 repeatable 整表（见设计 §5.1 / §3.1.1）：
 * - topFields: { name → default(type) | type ≠ label }
 * - repeatTables: { tableName → [defaultRow × min] }
 * - 行内子字段不单独入 store
 */
export function extractFieldDefaults(step: RenderStep): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  const layout = step.layout ?? flatten(step.fields)

  // 收集 repeatable 子字段 refs（排除出顶层）
  const repeatableRefs = new Set<string>()
  for (const node of walkLayout(layout)) {
    if (node.kind === 'repeatable') {
      for (const child of node.children ?? []) {
        if (child.kind === 'field' && child.ref) {
          repeatableRefs.add(child.ref)
        }
      }
    }
  }

  // 顶层字段默认值
  const fieldMap = new Map(step.fields.map((f) => [f.name, f]))
  for (const node of layout) {
    if (node.kind === 'field' && node.ref && !repeatableRefs.has(node.ref)) {
      const field = fieldMap.get(node.ref)
      if (field && field.type !== 'label') {
        defaults[node.ref] = defaultValue(field.type)
      }
    }
    // repeatable 整表
    if (node.kind === 'repeatable' && node.name) {
      const min = node.min ?? 1
      const row = defaultRow(node, fieldMap)
      defaults[node.name] = Array.from({ length: min }, () => ({ ...row }))
    }
  }

  // 无 layout 的扁平字段（flatten 后全是 field 节点，上面已处理）
  // 但如果 layout 不完整（某些 field 没在 layout 中引用），也要兜底
  for (const field of step.fields) {
    if (field.type === 'label') continue
    if (repeatableRefs.has(field.name)) continue
    if (!(field.name in defaults)) {
      defaults[field.name] = defaultValue(field.type)
    }
  }

  return defaults
}

// ─── 内部工具 ───

/** 遍历布局树（深度优先，含子节点） */
function* walkLayout(nodes: LayoutNode[]): Generator<LayoutNode> {
  for (const node of nodes) {
    yield node
    if (node.children) {
      yield* walkLayout(node.children)
    }
  }
}

/** 字段类型 → 默认值（见设计 §5.1 default 表） */
function defaultValue(type: FieldSchema['type']): unknown {
  switch (type) {
    case 'checkbox':
      return []
    case 'text':
    case 'textarea':
    case 'number':
    case 'phone':
    case 'id_card':
    case 'date':
    case 'select':
    case 'radio':
    case 'cascader':
    case 'image':
    case 'signature':
      return ''
    case 'label':
    default:
      return undefined
  }
}

/** repeatable 行默认对象：{ child.ref → default(child.type) | type ≠ label } */
function defaultRow(node: LayoutNode, fieldMap: Map<string, FieldSchema>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const child of node.children ?? []) {
    if (child.kind === 'field' && child.ref) {
      const field = fieldMap.get(child.ref)
      if (field && field.type !== 'label') {
        row[child.ref] = defaultValue(field.type)
      }
    }
  }
  return row
}
