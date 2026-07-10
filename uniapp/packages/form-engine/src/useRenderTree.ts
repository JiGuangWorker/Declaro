// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * useRenderTree — 渲染树辅助 composable（N1 红线：从 FormRenderer.vue 抽出树遍历逻辑）。
 *
 * FormRenderer 在 setup 阶段构造 RenderTreeAPI 实例并 provide，
 * RenderNode 通过 useRenderTree() inject 获取，完成：
 * - RenderContext 计算（DataStore 值 + RenderState 状态 → 展示包）
 * - 可见性判断（委托 SignalRouter.isNodeVisible，含祖先传播）
 * - repeatable 行数组读取
 * - 组件查表（委托 ComponentRegistry.get）
 * - 字段 required 状态（RenderState 覆盖原 required）
 *
 * 详见设计 §4.2 RenderContext 投影、§4.3 可见性传播、§5.3 校验语义。
 */
import { inject, type InjectionKey } from 'vue'
import type { FieldSchema } from './types/engine'
import type { RenderContext, FieldOption } from './types/slots'
import type { RegisteredComponent } from './component-registry'

/**
 * FormRenderer 提供给 RenderNode 的渲染辅助接口。
 */
export interface RenderTreeAPI {
  /** 计算指定字段在指定路径的 RenderContext（投影自 DataStore + RenderState） */
  getRenderContext(field: FieldSchema, fieldPath: string): RenderContext
  /** 判断布局节点是否可见（含祖先传播） */
  isNodeVisible(nodeId: string | undefined): boolean
  /** 获取 repeatable 子表的行数组 */
  getTableValue(tableName: string): Record<string, unknown>[]
  /** 按类型 key 查注册组件（未注册返回 Unknown 兜底） */
  getComponent(type: string): RegisteredComponent
  /** 获取字段的生效 required 状态（RenderState 覆盖原 required） */
  getFieldRequired(fieldPath: string, fallbackRequired: boolean): boolean
  /** 按 ref 查 FieldSchema */
  getFieldSchema(ref: string): FieldSchema | undefined
}

export const RenderTreeAPIKey: InjectionKey<RenderTreeAPI> = Symbol('renderTreeAPI')

/** RenderNode 注入此 composable 获取渲染辅助 */
export function useRenderTree(): RenderTreeAPI {
  const api = inject(RenderTreeAPIKey)
  if (!api) {
    throw new Error(
      '[FormRenderer] RenderTreeAPI not provided. RenderNode 必须嵌套在 <FormRenderer> 内。',
    )
  }
  return api
}

/** 从 fieldPath 提取基础字段名（'branches[0].name' → 'name'） */
export function extractBaseName(fieldPath: string): string {
  const match = fieldPath.match(/^[^[\]]+\[\d+\]\.(.+)$/)
  return match ? match[1] : fieldPath
}

/** 归一化 options（API 类型 value?/label? → FieldOption value/label） */
export function normalizeOptions(
  opts: { value?: string; label?: string }[] | undefined,
): FieldOption[] | undefined {
  if (!opts || opts.length === 0) return undefined
  return opts.map((o) => ({
    value: o.value ?? '',
    label: o.label ?? '',
  }))
}
