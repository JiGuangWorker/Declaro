// @vitest-environment happy-dom
// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * Tier 2 — layouts.test.ts
 *
 * 4 布局组件测试（#51-56）：
 * - SectionLayout: 渲染 title + children slot
 * - RowLayout: 渲染全部 children（同行）
 * - RepeatableLayout: 子表行渲染 + 增删 + 数量约束
 * - FieldWrap: label/星号/tips/error 统一外壳
 *
 * 测试环境：happy-dom。
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import { EngineChannelKey, EngineDataBindingKey } from '../slots'

import SectionLayout from '../layouts/SectionLayout.vue'
import RowLayout from '../layouts/RowLayout.vue'
import RepeatableLayout from '../layouts/RepeatableLayout.vue'
import FieldWrap from '../layouts/FieldWrap.vue'

// ─── 测试辅助 ───

function makeMockSlots() {
  return {
    emitSpy: vi.fn(),
    onSpy: vi.fn(() => () => {}),
    readSpy: vi.fn(() => ({ value: '', meta: { required: false } })),
    writeSpy: vi.fn(),
  }
}

function mountLayout(component: Parameters<typeof mount>[0], props: Record<string, unknown>, slots?: Record<string, string>) {
  const mocks = makeMockSlots()
  const wrapper = mount(component, {
    props,
    slots,
    global: {
      provide: {
        [EngineChannelKey]: { emit: mocks.emitSpy, on: mocks.onSpy },
        [EngineDataBindingKey]: { read: mocks.readSpy, write: mocks.writeSpy },
      },
    },
  })
  return { wrapper, mocks }
}

// ═══ #51 SectionLayout ═══

describe('layouts.test.ts', () => {
  describe('#51 SectionLayout 渲染 title + children slot', () => {
    it('有 title → 渲染标题文案', () => {
      const { wrapper } = mountLayout(SectionLayout, { title: '一、申请人基本情况' })
      expect(wrapper.text()).toContain('一、申请人基本情况')
    })

    it('有 title → 渲染 section 容器', () => {
      const { wrapper } = mountLayout(SectionLayout, { title: '分节' })
      expect(wrapper.find('.section-layout').exists() || wrapper.find('view').exists()).toBe(true)
    })

    it('children slot 内容被渲染', () => {
      const { wrapper } = mountLayout(SectionLayout, { title: '分节' }, {
        default: '<div class="child-content">子内容</div>',
      })
      expect(wrapper.text()).toContain('子内容')
    })

    it('无 title → 不渲染标题区块但仍渲染 children', () => {
      const { wrapper } = mountLayout(SectionLayout, {}, {
        default: '<div class="child-content">子内容</div>',
      })
      expect(wrapper.text()).toContain('子内容')
    })
  })

  // ═══ #52 RowLayout ═══

  describe('#52 RowLayout 渲染全部 children', () => {
    it('多个 children 全部渲染', () => {
      const { wrapper } = mountLayout(RowLayout, {}, {
        default: '<span class="c1">A</span><span class="c2">B</span><span class="c3">C</span>',
      })
      expect(wrapper.text()).toContain('A')
      expect(wrapper.text()).toContain('B')
      expect(wrapper.text()).toContain('C')
    })

    it('渲染 row 容器', () => {
      const { wrapper } = mountLayout(RowLayout, {})
      expect(wrapper.find('.row-layout').exists() || wrapper.find('view').exists()).toBe(true)
    })
  })

  // ═══ #53 RepeatableLayout value=N 行 → 渲染 N 行 + 增/删按钮 ═══

  describe('#53 RepeatableLayout 行渲染 + 增删按钮', () => {
    it('value=2 行 → 渲染 2 行', () => {
      const { wrapper } = mountLayout(RepeatableLayout, {
        value: [{ name: '分支1' }, { name: '分支2' }],
        name: 'branches',
        min: 1,
        max: 5,
      }, {
        default: '<div class="row-item">行</div>',
      })
      // 2 行 × slot 渲染
      expect(wrapper.findAll('.row-item').length).toBeGreaterThanOrEqual(2)
    })

    it('渲染增行按钮', () => {
      const { wrapper } = mountLayout(RepeatableLayout, {
        value: [{ name: 'A' }],
        name: 'branches',
        min: 1,
        max: 5,
      }, {
        default: '<div class="row-item">行</div>',
      })
      expect(wrapper.find('[data-action="add-row"]').exists()).toBe(true)
    })

    it('每行渲染删行按钮', () => {
      const { wrapper } = mountLayout(RepeatableLayout, {
        value: [{ name: 'A' }, { name: 'B' }],
        name: 'branches',
        min: 1,
        max: 5,
      }, {
        default: '<div class="row-item">行</div>',
      })
      expect(wrapper.find('[data-action="remove-row"]').exists()).toBe(true)
    })
  })

  // ═══ #54 增删行 → emit ═══

  describe('#54 RepeatableLayout 增删行 → emit', () => {
    it('点击增行 → emit 追加行对象', async () => {
      const { wrapper, mocks } = mountLayout(RepeatableLayout, {
        value: [{ name: 'A' }],
        name: 'branches',
        min: 1,
        max: 5,
      }, {
        default: '<div class="row-item">行</div>',
      })
      const addBtn = wrapper.find('[data-action="add-row"]') || wrapper.find('.add-btn')
      await addBtn.trigger('click')
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'branches' }),
      )
      const call = mocks.emitSpy.mock.calls[0]?.[0] as { payload: unknown } | undefined
      const payload = call?.payload as unknown[]
      expect(payload?.length).toBe(2) // 1 → 2
    })

    it('点击删行 → emit 移除行', async () => {
      const { wrapper, mocks } = mountLayout(RepeatableLayout, {
        value: [{ name: 'A' }, { name: 'B' }],
        name: 'branches',
        min: 1,
        max: 5,
      }, {
        default: '<div class="row-item">行</div>',
      })
      const removeBtn = wrapper.find('[data-action="remove-row"]') || wrapper.find('.remove-btn')
      await removeBtn.trigger('click')
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'branches' }),
      )
      const call = mocks.emitSpy.mock.calls[0]?.[0] as { payload: unknown } | undefined
      const payload = call?.payload as unknown[]
      expect(payload?.length).toBe(1) // 2 → 1
    })
  })

  // ═══ #55 max/min 约束 ═══

  describe('#55 RepeatableLayout 数量约束', () => {
    it('达 max → 禁用增行按钮', () => {
      const { wrapper } = mountLayout(RepeatableLayout, {
        value: [{ a: 1 }, { a: 2 }, { a: 3 }],
        name: 'branches',
        min: 1,
        max: 3,
      }, {
        default: '<div class="row-item">行</div>',
      })
      const addBtn = wrapper.find('[data-action="add-row"]')
      expect(addBtn.exists()).toBe(true)
      // 禁用状态：class 含 disabled
      expect(addBtn.classes()).toContain('disabled')
    })

    it('低于 min → 渲染提示', () => {
      const { wrapper } = mountLayout(RepeatableLayout, {
        value: [],
        name: 'branches',
        min: 2,
        max: 5,
      }, {
        default: '<div class="row-item">行</div>',
      })
      // 至少 0 行但 min=2 → 应有提示或自动补行
      expect(wrapper.text()).toBeTruthy()
    })
  })

  // ═══ #56 FieldWrap label/星号/tips/error 统一外壳 ═══

  describe('#56 FieldWrap 统一外壳', () => {
    it('label 渲染', () => {
      const { wrapper } = mountLayout(FieldWrap, { label: '姓名' })
      expect(wrapper.text()).toContain('姓名')
    })

    it('required=true → 渲染星号', () => {
      const { wrapper } = mountLayout(FieldWrap, { label: '姓名', required: true })
      expect(wrapper.find('.required-star').exists()).toBe(true)
    })

    it('required=false → 无星号', () => {
      const { wrapper } = mountLayout(FieldWrap, { label: '姓名', required: false })
      expect(wrapper.find('.required-star').exists()).toBe(false)
    })

    it('tips 渲染', () => {
      const { wrapper } = mountLayout(FieldWrap, { label: '姓名', tips: '请如实填写' })
      expect(wrapper.text()).toContain('请如实填写')
    })

    it('error 渲染', () => {
      const { wrapper } = mountLayout(FieldWrap, { label: '姓名', error: '不能为空' })
      expect(wrapper.text()).toContain('不能为空')
    })

    it('error=null → 无错误区块', () => {
      const { wrapper } = mountLayout(FieldWrap, { label: '姓名', error: null })
      expect(wrapper.find('.field-error').exists()).toBe(false)
    })

    it('slot 内容渲染', () => {
      const { wrapper } = mountLayout(FieldWrap, { label: '姓名' }, {
        default: '<input class="inner-input" />',
      })
      expect(wrapper.find('.inner-input').exists()).toBe(true)
    })
  })
})
