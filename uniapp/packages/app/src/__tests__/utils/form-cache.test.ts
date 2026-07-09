// Copyright (c) 2026 Declaro. All rights reserved.

import { describe, expect, it, vi } from 'vitest'
import { __mockStorage, __uniStub as uni } from '../setup'
import {
  clearFormLocal,
  getFormLocal,
  listFormCache,
  saveFormLocal,
} from '../../utils/form-cache'

describe('form-cache（AC#5 本地缓存）', () => {
  describe('saveFormLocal / getFormLocal', () => {
    it('保存后可读取，结构完整', () => {
      saveFormLocal('mat_1', 'step_a', { name: '张三' })
      const entry = getFormLocal('mat_1', 'step_a')
      expect(entry).not.toBeNull()
      expect(entry!.material_id).toBe('mat_1')
      expect(entry!.step_id).toBe('step_a')
      expect(entry!.fields).toEqual({ name: '张三' })
      expect(entry!.updated_at).toBeLessThanOrEqual(Date.now())
    })

    it('未保存返回 null', () => {
      expect(getFormLocal('mat_1', 'step_a')).toBeNull()
    })

    it('覆盖式写入刷新 updated_at', async () => {
      saveFormLocal('mat_1', 'step_a', { v: 1 })
      const t1 = getFormLocal('mat_1', 'step_a')!.updated_at
      await new Promise((r) => setTimeout(r, 5))
      saveFormLocal('mat_1', 'step_a', { v: 2 })
      const entry = getFormLocal('mat_1', 'step_a')
      expect(entry!.updated_at).toBeGreaterThan(t1)
      expect(entry!.fields).toEqual({ v: 2 })
    })

    it('key 格式为 declaro:form:{material_id}:{step_id}', () => {
      saveFormLocal('mat_1', 'step_a', {})
      expect(vi.mocked(uni.setStorageSync)).toHaveBeenCalledWith(
        'declaro:form:mat_1:step_a',
        expect.objectContaining({
          material_id: 'mat_1',
          step_id: 'step_a',
        }),
      )
    })
  })

  describe('clearFormLocal', () => {
    it('清除后读不到', () => {
      saveFormLocal('mat_1', 'step_a', {})
      clearFormLocal('mat_1', 'step_a')
      expect(getFormLocal('mat_1', 'step_a')).toBeNull()
    })

    it('清除调用 removeStorageSync', () => {
      clearFormLocal('mat_1', 'step_a')
      expect(vi.mocked(uni.removeStorageSync)).toHaveBeenCalledWith(
        'declaro:form:mat_1:step_a',
      )
    })
  })

  describe('listFormCache', () => {
    it('空时返回空数组', () => {
      expect(listFormCache()).toEqual([])
    })

    it('列出所有步骤缓存', () => {
      saveFormLocal('mat_1', 'step_a', {})
      saveFormLocal('mat_1', 'step_b', {})
      saveFormLocal('mat_2', 'step_a', {})
      expect(listFormCache()).toHaveLength(3)
    })

    it('按 materialId 过滤', () => {
      saveFormLocal('mat_1', 'step_a', {})
      saveFormLocal('mat_1', 'step_b', {})
      saveFormLocal('mat_2', 'step_a', {})
      const mat1 = listFormCache('mat_1')
      expect(mat1).toHaveLength(2)
      expect(mat1.every((e) => e.material_id === 'mat_1')).toBe(true)
    })

    it('忽略非 declaro:form: 前缀的 key', () => {
      // 注入非 form 前缀的 storage 项（如 token）
      __mockStorage.set('declaro:auth:token', 'xxx')
      saveFormLocal('mat_1', 'step_a', {})
      expect(listFormCache()).toHaveLength(1)
    })
  })
})
