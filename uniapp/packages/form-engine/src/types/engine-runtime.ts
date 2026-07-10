// TODO(openapi): 后端集成切片前必须将 StepSchema.layout / StepSchema.linkage
// 合并至 docs/api/openapi.yaml 的 StepSchema 定义，重新生成 shared/api-types，
// 并删除本文件。CI grep 检查（C11 门禁）会追踪本文件存在性。

// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * L2 过渡类型容器（openapi 后补前隔离）。
 *
 * StepSchema 在 openapi 中尚无 layout/linkage 字段（L2 接线扩展未补）。
 * 本文件定义引擎侧消费形态，供 FormRenderer prop、fixture 构造、schema-reader 消费。
 * 后端集成切片补 openapi 后，这些类型并入 api-types，本文件删除。
 *
 * 详见设计文档 §0.1 类型分层、§6 C11 机械化落地。
 */

import type { StepSchema, LayoutNode } from './engine'
import type { LinkageBinding } from '../linkage/types'

/**
 * StepSchema 的运行时扩展（L2 接线）。
 * fixture 提供，schema-reader 消费，产出 RenderStep。
 */
export interface RuntimeStep extends StepSchema {
  /** 布局拓扑接线（§2.2）；未配 → 退化为 flatten(fields) */
  layout?: LayoutNode[]
  /** 信号路由接线（§2.3）；handler 路由在 SignalRouter 实现 */
  linkage?: LinkageBinding[]
}

/** StepSchema 的 L2 接线扩展字段（layout + linkage），独立于 StepSchema 可构造 */
export interface StepSchemaRuntimeExtension {
  layout?: LayoutNode[]
  linkage?: LinkageBinding[]
}

/**
 * 运行时表单 schema（L2 接线扩展）。
 * FormRenderer 的 prop 类型，fixture 构造此类型。
 */
export interface RuntimeFormSchema {
  template_id: string
  version: string
  steps: RuntimeStep[]
}
