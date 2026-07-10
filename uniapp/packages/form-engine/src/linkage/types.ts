// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 联动域类型（L4 内核私有，组件禁 import，ESLint 拦截）。
 *
 * 定义 Effect 封闭契约（6 种）、LinkageHandler 接口、LinkageBinding schema 声明。
 * 详见设计文档 §3.2 Effect 契约、§2.3 LinkageBinding、§3.4 双注册表。
 */
import type { InteractionSignal, FieldOption } from '../types/slots'
import type { DataStore } from '../data-store'

// ─── Effect（6 种封闭契约，内核 SignalRouter 识别）───

export type EffectType =
  | 'set-visibility'
  | 'set-required'
  | 'set-value'
  | 'set-options'
  | 'set-error'
  | 'set-disabled'

/**
 * Effect 判别联合：type 作为判别符，payload 形态由 type 决定。
 * SignalRouter.applyEffects 的 switch 按 type 收窄 payload（TS 自动推导）。
 */
export type Effect =
  | { type: 'set-visibility'; target: string; payload: { visible: boolean } }
  | { type: 'set-required'; target: string; payload: { required: boolean } }
  | { type: 'set-value'; target: string; payload: { value: unknown } }
  | { type: 'set-options'; target: string; payload: { options: FieldOption[] } }
  | { type: 'set-error'; target: string; payload: { error: string | null } }
  | { type: 'set-disabled'; target: string; payload: { disabled: boolean } }

/** 各 Effect 的 payload 形态（供 handler 构造时类型约束） */
export type EffectPayload =
  | { visible: boolean }        // set-visibility
  | { required: boolean }       // set-required
  | { value: unknown }          // set-value
  | { options: FieldOption[] }  // set-options
  | { error: string | null }    // set-error
  | { disabled: boolean }       // set-disabled

// ─── LinkageHandler（可注册处理器，内核不含联动逻辑）───

/**
 * 处理器上下文：SignalRouter 调用 handler.apply 时注入。
 * target 来自 LinkageBinding，handler 将其写入 Effect.target。
 */
export interface HandlerContext {
  signal: InteractionSignal
  dataStore: DataStore
  /** 当前步骤 ID（handler 读 DataStore 时需要） */
  stepId: string
  params: unknown
  target: string
}

/**
 * 可注册处理器接口。apply 为纯函数：同 ctx 必产同 Effect[]（C32 可测性）。
 */
export interface LinkageHandler {
  name: string
  apply: (ctx: HandlerContext) => Effect[]
}

// ─── LinkageBinding（schema 内声明式数据，非逻辑）───

/**
 * 信号路由接线声明。只声明「哪个 handler + 什么参数 + 作用到哪」。
 * on.field 仅限顶层字段或 repeatable 整表 key（见设计 §2.3 / §3.1.1）。
 */
export interface LinkageBinding {
  /** 处理器名（HandlerRegistry 查） */
  handler: string
  /** 订阅哪个字段的 change 信号 */
  on: { field: string }
  /** SystemEvent 作用对象：先查 layout node id，再查 field name */
  target: string
  /** 处理器特定参数。conditional-* 用 Condition[]（AND 语义） */
  params?: unknown
}
