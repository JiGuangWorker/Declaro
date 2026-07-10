// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * DataStore — 扁平键值存储（L4 内核私有）。
 *
 * Map<stepId, Map<fieldPath, value>>。repeatable 子表整表存为一个 key，
 * value = 行对象数组。详见设计 §3.1 DataStore、§3.1.1 fieldPath 规约。
 *
 * 组件经 IDataBindable 间接访问，禁止直接调用（C7）。
 */
export class DataStore {
  private store = new Map<string, Map<string, unknown>>()

  /** 确保 step 容器存在 */
  private ensureStep(stepId: string): Map<string, unknown> {
    let step = this.store.get(stepId)
    if (!step) {
      step = new Map()
      this.store.set(stepId, step)
    }
    return step
  }

  /** 读：返回字段值（行内子字段自动解析路径） */
  read(stepId: string, fieldPath: string): unknown {
    const step = this.store.get(stepId)
    if (!step) return undefined
    return this.resolveValue(step, fieldPath)
  }

  /** 写：设置字段值（行内子字段自动解析路径，触发数组引用替换） */
  write(stepId: string, fieldPath: string, value: unknown): void {
    const step = this.ensureStep(stepId)
    this.assignValue(step, fieldPath, value)
  }

  /** 批量初始化（extractFieldDefaults 输出） */
  initStep(stepId: string, defaults: Record<string, unknown>): void {
    const step = this.ensureStep(stepId)
    for (const [key, val] of Object.entries(defaults)) {
      step.set(key, val)
    }
  }

  /** 获取整步数据快照（用于提交/测试） */
  getStepData(stepId: string): Record<string, unknown> {
    const step = this.store.get(stepId)
    if (!step) return {}
    return Object.fromEntries(step.entries())
  }

  /** 清空指定步骤 */
  clearStep(stepId: string): void {
    this.store.delete(stepId)
  }

  // ─── 行内子字段路径解析（§3.1.1）───

  /** 解析 `branches[1].premise` → 返回该行该属性值 */
  private resolveValue(step: Map<string, unknown>, fieldPath: string): unknown {
    const match = fieldPath.match(/^([^[\]]+)\[(\d+)\]\.(.+)$/)
    if (!match) {
      return step.get(fieldPath)
    }
    const [, tableKey, indexStr, subField] = match
    const rows = step.get(tableKey)
    if (!Array.isArray(rows)) return undefined
    const rowIndex = parseInt(indexStr, 10)
    const row = rows[rowIndex]
    if (row == null || typeof row !== 'object') return undefined
    return (row as Record<string, unknown>)[subField]
  }

  /** 赋值 `branches[1].premise` → 不可变更新目标行对象 → 回写数组 */
  private assignValue(step: Map<string, unknown>, fieldPath: string, value: unknown): void {
    const match = fieldPath.match(/^([^[\]]+)\[(\d+)\]\.(.+)$/)
    if (!match) {
      step.set(fieldPath, value)
      return
    }
    const [, tableKey, indexStr, subField] = match
    const rows = step.get(tableKey)
    if (!Array.isArray(rows)) return
    const rowIndex = parseInt(indexStr, 10)
    const oldRow = rows[rowIndex] ?? {}
    const newRow = { ...oldRow, [subField]: value }
    const newRows = [...rows]
    newRows[rowIndex] = newRow
    step.set(tableKey, newRows)
  }
}
