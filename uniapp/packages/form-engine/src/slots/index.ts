// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 三相插槽 composable 统一出口。
 *
 * 组件 import 此文件获取三相能力：
 * - useSignalChannel(fieldPath) → ISignalChannel（通信解耦相）
 * - useDataBinding(fieldPath) → IDataBindable（数据绑定相）
 *
 * 本体能力相（RenderContext）由 FormRenderer 作为 prop 注入，无需 composable。
 *
 * InjectionKey 也从此处导出，供 FormRenderer provide 与测试 mount 时注入。
 */
export { useSignalChannel, EngineChannelKey, type EngineChannel } from './useSignalChannel'
export { useDataBinding, EngineDataBindingKey, type EngineDataBinding } from './useDataBinding'
