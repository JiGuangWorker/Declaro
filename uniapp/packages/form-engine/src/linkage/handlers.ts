// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 内置处理器（注册项，非内核核心）。
 *
 * conditional-visibility / conditional-required：基于 Condition[] 的条件判断联动。
 * registerBuiltins 注册到 HandlerRegistry。详见设计 §3.4、D7。
 */
import type { Condition } from '../types/engine'
import type { LinkageHandler, Effect } from './types'
import { evalConditions } from './condition'
import type { HandlerRegistryImpl } from './registry'

/**
 * conditional-visibility：条件全部满足 → set-visibility=true；任一不满足 → false
 */
export const conditionalVisibilityHandler: LinkageHandler = {
  name: 'conditional-visibility',
  apply(ctx): Effect[] {
    const conds = (ctx.params ?? []) as Condition[]
    const getValue = (field: string) => ctx.dataStore.read(ctx.stepId, field)
    const visible = evalConditions(conds, getValue)
    return [{ type: 'set-visibility', target: ctx.target, payload: { visible } }]
  },
}

/**
 * conditional-required：条件全部满足 → set-required=true；任一不满足 → false
 */
export const conditionalRequiredHandler: LinkageHandler = {
  name: 'conditional-required',
  apply(ctx): Effect[] {
    const conds = (ctx.params ?? []) as Condition[]
    const getValue = (field: string) => ctx.dataStore.read(ctx.stepId, field)
    const required = evalConditions(conds, getValue)
    return [{ type: 'set-required', target: ctx.target, payload: { required } }]
  },
}

/**
 * 注册内置处理器到 registry。应用启动单次调用。
 */
export function registerBuiltins(registry: HandlerRegistryImpl): void {
  registry.register(conditionalVisibilityHandler)
  registry.register(conditionalRequiredHandler)
}
