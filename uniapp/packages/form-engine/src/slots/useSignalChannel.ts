// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 通信解耦相 composable —— 事件总线槽（ISignalChannel）的 Vue 落地层。
 *
 * 组件通过此 composable 获得信号收发能力，不直接接触 SignalRouter 内核。
 * FormRenderer 在 setup 阶段 provide EngineChannel，组件 inject 后绑定 fieldPath。
 *
 * 详见设计 §1.3 事件总线槽、§1.4 三相协同数据流。
 */
import { inject, type InjectionKey } from 'vue'
import type {
  InteractionSignal,
  ISignalChannel,
  SystemEvent,
  SystemEventType,
  Unsubscribe,
} from '../types/slots'

/**
 * 引擎通道：FormRenderer provide 的原始信号收发接口。
 * 内部委托 SignalRouter.emit / SignalRouter.on。
 */
export interface EngineChannel {
  emit(signal: InteractionSignal): void
  on(type: SystemEventType, handler: (event: SystemEvent) => void): Unsubscribe
}

export const EngineChannelKey: InjectionKey<EngineChannel> = Symbol('engineChannel')

/**
 * 获取绑定 fieldPath 的信号通道。
 * emit 时自动填充 fieldPath（组件无需关心路由）。
 */
export function useSignalChannel(fieldPath: string): ISignalChannel {
  const channel = inject(EngineChannelKey)
  if (!channel) {
    throw new Error(
      '[FormRenderer] EngineChannel not provided. 组件必须嵌套在 <FormRenderer> 内。',
    )
  }
  return {
    emit(signal: InteractionSignal): void {
      channel.emit({ ...signal, fieldPath })
    },
    on(type: SystemEventType, handler: (event: SystemEvent) => void): Unsubscribe {
      return channel.on(type, handler)
    },
  }
}
