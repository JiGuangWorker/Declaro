// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * L3 插槽契约（三相插槽标准，组件可见）。
 *
 * 组件 = IRenderable ∩ IDataBindable ∩ ISignalChannel，三正交标准接口。
 * 本文件是组件唯一允许 import 的引擎类型文件（ESLint 放行）。
 * 内核类型见 types/engine.ts（组件禁 import，ESLint 拦截）。
 *
 * 详见设计文档 §1 三相插槽接口契约。
 */

/** 选项（select/radio/checkbox/cascader 专有） */
export interface FieldOption {
  value: string | number
  label: string
}

/** 校验元数据（仅展示用，组件不执行校验） */
export interface ValidationMeta {
  pattern?: string
  min_length?: number
  max_length?: number
}

// ─── 本体能力相：渲染交互槽（IRenderable）───

/**
 * 渲染上下文：平台注入组件的纯展示包。
 * 不含 FieldSchema 的 name/type/required 等元信息（那些归数据绑定相）。
 * 组件对「为何 disabled」「error 从哪来」完全无感知，仅按属性渲染。
 */
export interface RenderContext {
  value: unknown
  readonly: boolean
  disabled: boolean
  error: string | null
  label: string
  placeholder: string
  tips: string | undefined
  options: FieldOption[] | undefined
  validation: ValidationMeta | undefined
}

/** 用户操作类型 */
export type InteractionType = 'change' | 'focus' | 'blur'

/**
 * 交互信号：组件发射，不直接调引擎。
 * change 时 payload=新值；focus/blur 时 payload=∅。
 */
export interface InteractionSignal {
  type: InteractionType
  /** 信号来源字段路径（平台注入，组件透传） */
  fieldPath: string
  payload: unknown
}

// ─── 数据绑定相：数据模型槽（IDataBindable）───

/** 字段元数据（用于渲染星号等） */
export interface FieldMeta {
  required: boolean
}

/** 变更请求：组件提交的写语义（请求，非命令） */
export interface ChangeRequest {
  fieldPath: string
  value: unknown
}

/**
 * 数据绑定接口：基于 Schema 声明式绑定。
 * 组件不持有存储引用，通过此接口读写分离。
 */
export interface IDataBindable {
  /** 读：获取当前值 + 元数据，不触发副作用 */
  read(): { value: unknown; meta: FieldMeta }
  /** 写：仅提交变更请求，平台统一处理持久化与校验 */
  write(change: ChangeRequest): void
}

// ─── 通信解耦相：事件总线槽（ISignalChannel）───

/** 系统事件类型（6 种封闭契约） */
export type SystemEventType =
  | 'reset'
  | 'visibility-change'
  | 'required-change'
  | 'options-change'
  | 'error-update'
  | 'disable-update'

/**
 * 系统事件：平台 → 组件的标准化事件（判别联合）。
 * 组件仅通过插槽监听这些事件，禁止直接订阅其他组件事件。
 */
export type SystemEvent =
  | { type: 'reset'; payload: { fieldPath: string; value: unknown } }
  | { type: 'visibility-change'; payload: { nodeId: string; visible: boolean } }
  | { type: 'required-change'; payload: { fieldPath: string; required: boolean } }
  | {
      type: 'options-change'
      payload: { fieldPath: string; options: FieldOption[] }
    }
  | { type: 'error-update'; payload: { fieldPath: string; error: string | null } }
  | { type: 'disable-update'; payload: { fieldPath: string; disabled: boolean } }

/** 取消订阅函数 */
export type Unsubscribe = () => void

/**
 * 信号通道接口：组件与外界通信的唯一匿名管道。
 * 发送方/订阅方互不可见。
 */
export interface ISignalChannel {
  /** 推信号入总线（组件 → 平台） */
  emit(signal: InteractionSignal): void
  /** 订阅系统事件（平台 → 组件） */
  on(type: SystemEventType, handler: (event: SystemEvent) => void): Unsubscribe
}
