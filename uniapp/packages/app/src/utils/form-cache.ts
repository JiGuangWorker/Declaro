// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 表单数据本地缓存（断网可读、中断恢复）。
 *
 * 对齐 PRD §5.1 异常B（中断恢复）与 §5.2 异常C（回退加载）：
 * - 失焦逐字段 PUT 前先写本地，断网时写本地，联网后按 updated_at 增量同步
 * - 回退到已完成步骤时本地兜底读取，避免无网空白
 *
 * key 设计：`declaro:form:{material_id}:{step_id}`，步骤级隔离，避免冲突。
 */

export interface FormCacheEntry {
  material_id: string
  step_id: string
  /** 字段键值（field name -> value） */
  fields: Record<string, unknown>
  /** 最近一次写入时间戳（毫秒） */
  updated_at: number
}

const PREFIX = 'declaro:form:'

function cacheKey(materialId: string, stepId: string): string {
  return `${PREFIX}${materialId}:${stepId}`
}

/** 保存某步骤的表单字段到本地（覆盖式，刷新 updated_at） */
export function saveFormLocal(
  materialId: string,
  stepId: string,
  fields: Record<string, unknown>,
): void {
  const entry: FormCacheEntry = {
    material_id: materialId,
    step_id: stepId,
    fields,
    updated_at: Date.now(),
  }
  uni.setStorageSync(cacheKey(materialId, stepId), entry)
}

/** 读取某步骤的本地缓存，无则返回 null */
export function getFormLocal(materialId: string, stepId: string): FormCacheEntry | null {
  const raw = uni.getStorageSync(cacheKey(materialId, stepId))
  if (!raw) return null
  return raw as FormCacheEntry
}

/** 清除某步骤的本地缓存（服务端确认保存后调用） */
export function clearFormLocal(materialId: string, stepId: string): void {
  uni.removeStorageSync(cacheKey(materialId, stepId))
}

/** 列出本地缓存的表单条目；传 materialId 则只列该实例下所有步骤 */
export function listFormCache(materialId?: string): FormCacheEntry[] {
  const info = uni.getStorageInfoSync()
  const keys: string[] = info.keys || []
  const result: FormCacheEntry[] = []
  for (const key of keys) {
    if (!key.startsWith(PREFIX)) continue
    const entry = uni.getStorageSync(key) as FormCacheEntry | undefined
    if (!entry) continue
    if (materialId && entry.material_id !== materialId) continue
    result.push(entry)
  }
  return result
}
