// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * @declaro/form-engine 公共 API。
 *
 * 消费方典型用法：
 * ```ts
 * import {
 *   FormRenderer,
 *   componentRegistry,
 *   registerEngineComponents,
 *   handlerRegistry,
 *   registerBuiltins,
 * } from '@declaro/form-engine'
 *
 * // 引擎注册（幂等，全局单例，应用启动单次调用）
 * registerEngineComponents(componentRegistry)
 * registerBuiltins(handlerRegistry)
 * ```
 */

// 组件
export { default as FormRenderer } from './FormRenderer.vue'
export { default as RenderNode } from './RenderNode.vue'

// 组件注册
export {
  componentRegistry,
  registerEngineComponents,
  createComponentRegistry,
  FIELD_TYPE_KEYS,
  LAYOUT_TYPE_KEYS,
} from './component-registry'

// 联动处理器注册
export { handlerRegistry, createHandlerRegistry } from './linkage/registry'
export { registerBuiltins } from './linkage/handlers'

// 类型（供消费方使用，type-only export）
export type { RuntimeFormSchema, RuntimeStep } from './types/engine-runtime'
export type { FieldSchema, LayoutNode, RenderStep } from './types/engine'
export type { RenderContext, FieldOption, FieldMeta } from './types/slots'
