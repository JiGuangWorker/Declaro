// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 数据绑定相 composable —— 数据模型槽（IDataBindable）的 Vue 落地层。
 *
 * 组件通过此 composable 获得读写分离的数据访问能力，不直接接触 DataStore 内核。
 * FormRenderer 在 setup 阶段 provide EngineDataBinding，组件 inject 后绑定 fieldPath。
 *
 * 详见设计 §1.2 数据模型槽、§1.4 三相协同数据流。
 */
import { inject, type InjectionKey } from 'vue'
import type {
  ChangeRequest,
  FieldMeta,
  IDataBindable,
} from '../types/slots'

/**
 * 引擎数据绑定：FormRenderer provide 的原始读写接口。
 * 内部委托 DataStore.read / DataStore.write。
 */
export interface EngineDataBinding {
  read(fieldPath: string): { value: unknown; meta: FieldMeta }
  write(change: ChangeRequest): void
}

export const EngineDataBindingKey: InjectionKey<EngineDataBinding> = Symbol('engineDataBinding')

/**
 * 获取绑定 fieldPath 的数据绑定接口。
 * read 返回当前值 + 元数据（required 等）；write 提交变更请求（请求语义，非命令）。
 */
export function useDataBinding(fieldPath: string): IDataBindable {
  const binding = inject(EngineDataBindingKey)
  if (!binding) {
    throw new Error(
      '[FormRenderer] EngineDataBinding not provided. 组件必须嵌套在 <FormRenderer> 内。',
    )
  }
  return {
    read() {
      return binding.read(fieldPath)
    },
    write(change: ChangeRequest): void {
      binding.write({ ...change, fieldPath })
    },
  }
}
