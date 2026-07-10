// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * Condition 谓词 + eval（内置处理器的 params 解析逻辑，非内核）。
 *
 * 详见设计 §2.4 Condition。8 种算子：eq/neq/in/not_in/gt/lt/empty/not_empty。
 * 仅依赖同步骤内字段（C9），通过 getValue 函数读取，保持纯函数可测性。
 */
import type { Condition } from '../types/engine'

/** 判断值是否为「空」 */
export function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (v === '') return true
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v as object).length === 0
  return false
}

/** eval 单个 Condition */
export function evalCondition(cond: Condition, getValue: (field: string) => unknown): boolean {
  const v = getValue(cond.field)
  switch (cond.op) {
    case 'eq':
      return v === cond.value
    case 'neq':
      return v !== cond.value
    case 'in':
      return Array.isArray(cond.value) && cond.value.includes(v as never)
    case 'not_in':
      return Array.isArray(cond.value) && !cond.value.includes(v as never)
    case 'gt':
      return Number(v) > Number(cond.value)
    case 'lt':
      return Number(v) < Number(cond.value)
    case 'empty':
      return isEmpty(v)
    case 'not_empty':
      return !isEmpty(v)
    default:
      return false
  }
}

/** eval 多个 Condition（AND 语义） */
export function evalConditions(conds: Condition[], getValue: (field: string) => unknown): boolean {
  return conds.length > 0 && conds.every((c) => evalCondition(c, getValue))
}
