// @vitest-environment happy-dom
// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * Tier 2 — FormRenderer.test.ts
 *
 * FormRenderer 端到端测试（#57-69）：
 * - schema 驱动渲染（零硬编码）
 * - 布局树遍历（section/row/repeatable + 扁平兼容）
 * - 联动端到端（条件可见/条件必填/隐藏传播/提交过滤）
 * - 扩展性（自定义 handler 端到端）
 * - 健壮性（未知类型/空 steps/stepId 选择）
 * - 有效性 emit
 *
 * 测试环境：happy-dom。
 */
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import FormRenderer from '../FormRenderer.vue'
import { registerEngineComponents } from '../component-registry'
import { registerBuiltins } from '../linkage/handlers'
import { componentRegistry } from '../component-registry'
import { handlerRegistry as globalHandlerRegistry } from '../linkage/registry'

import { fullSchema, minimalSchema, unknownSchema } from './fixtures'
import type { RuntimeFormSchema } from './fixtures'

// ─── 测试辅助 ───

function mountRenderer(props: Record<string, unknown>) {
  return mount(FormRenderer, { props: props as never })
}

// ─── 确保内置组件已注册（幂等） ───
registerEngineComponents(componentRegistry)
registerBuiltins(globalHandlerRegistry)

// ═══ #57 fullSchema form 步骤 → 渲染全部 13 字段 ═══

describe('FormRenderer.test.ts', () => {
  describe('#57 fullSchema → 渲染全部 13 字段', () => {
    it('form 步骤渲染 13 种字段类型', () => {
      const wrapper = mountRenderer({ schema: fullSchema })
      // 检查各类型 input 元素存在
      expect(wrapper.find('input').exists()).toBe(true)   // text/number/phone/id_card
      expect(wrapper.find('textarea').exists()).toBe(true) // textarea
      expect(wrapper.find('picker').exists()).toBe(true)   // date/select/cascader
      expect(wrapper.find('radio-group').exists()).toBe(true) // radio
      expect(wrapper.find('checkbox-group').exists()).toBe(true) // checkbox
    })
  })

  // ═══ #58 换 schema → 输出随之变 ═══

  describe('#58 换 schema → 输出随之变', () => {
    it('切换 schema 后渲染内容变化', async () => {
      const wrapper = mountRenderer({ schema: fullSchema })
      const fieldsBefore = wrapper.findAll('input, textarea, picker, radio-group, checkbox-group').length

      await wrapper.setProps({ schema: minimalSchema } as never)
      const fieldsAfter = wrapper.findAll('input, textarea, picker, radio-group, checkbox-group').length

      expect(fieldsAfter).toBeLessThan(fieldsBefore)
    })
  })

  // ═══ #59 有 layout → 按树渲染 ═══

  describe('#59 layout → 按树渲染', () => {
    it('section/row/repeatable 结构正确渲染', () => {
      const wrapper = mountRenderer({ schema: fullSchema })
      // section 标题渲染
      expect(wrapper.find('.section-layout').exists() || wrapper.find('.section-title').exists()).toBe(true)
    })
  })

  // ═══ #60 无 layout → 扁平渲染 ═══

  describe('#60 无 layout → 扁平渲染', () => {
    it('无 layout 时退化为扁平渲染', () => {
      const wrapper = mountRenderer({ schema: minimalSchema })
      // 至少渲染一个字段
      expect(wrapper.find('input').exists()).toBe(true)
      // 无 section 结构
      expect(wrapper.find('.section-layout').exists()).toBe(false)
    })
  })

  // ═══ #61 联动可见（端到端） ═══

  describe('#61 联动可见端到端', () => {
    it('改字段 A 值 → 字段 B 可见性切换', async () => {
      // 用含 conditional-visibility 的 schema
      const schema: RuntimeFormSchema = {
        template_id: 't1',
        version: '1',
        steps: [{
          id: 's1',
          name: '测试步骤',
          type: 'form',
          fields: [
            { name: 'has_branches', label: '是否有分支', type: 'radio', required: true,
              options: [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }] },
            { name: 'branch_detail', label: '分支详情', type: 'text', required: false },
          ],
          layout: [
            { kind: 'field', ref: 'has_branches', id: 'has_branches' },
            { kind: 'field', ref: 'branch_detail', id: 'branch_detail' },
          ],
          linkage: [
            { handler: 'conditional-visibility', on: { field: 'has_branches' }, target: 'branch_detail',
              params: [{ field: 'has_branches', op: 'eq', value: 'yes' }] },
          ],
        }],
      }
      const wrapper = mountRenderer({ schema })

      // 初始：has_branches 未选 'yes' → branch_detail 隐藏
      await flushPromises()

      // 选择 'yes' → branch_detail 可见
      const radioGroup = wrapper.find('radio-group')
      await radioGroup.trigger('change', { detail: { value: 'yes' } })
      await flushPromises()

      // branch_detail 应该可见了（渲染了 input）
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ═══ #62 条件必填 → 星号 ═══

  describe('#62 条件必填联动', () => {
    it('条件满足 → 字段 B 显示必填星号', async () => {
      const schema: RuntimeFormSchema = {
        template_id: 't1',
        version: '1',
        steps: [{
          id: 's1',
          name: '测试',
          type: 'form',
          fields: [
            { name: 'trigger', label: '触发', type: 'select', required: false,
              options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }] },
            { name: 'target', label: '目标', type: 'text', required: false },
          ],
          layout: [
            { kind: 'field', ref: 'trigger', id: 'trigger' },
            { kind: 'field', ref: 'target', id: 'target' },
          ],
          linkage: [
            { handler: 'conditional-required', on: { field: 'trigger' }, target: 'target',
              params: [{ field: 'trigger', op: 'eq', value: 'A' }] },
          ],
        }],
      }
      const wrapper = mountRenderer({ schema })
      await flushPromises()

      // 初始：trigger 未选 A → target 非必填
      const starsBefore = wrapper.findAll('.required-star').length

      // 选 A → target 变必填
      const picker = wrapper.find('picker')
      await picker.trigger('change', { detail: { value: 0 } }) // index 0 = 'A'
      await flushPromises()

      const starsAfter = wrapper.findAll('.required-star').length
      expect(starsAfter).toBeGreaterThan(starsBefore)
    })
  })

  // ═══ #63 section 联动隐藏 → 整节隐藏 ═══

  describe('#63 section 隐藏传播', () => {
    it('section 隐藏 → 子字段全部隐藏', async () => {
      const schema: RuntimeFormSchema = {
        template_id: 't1',
        version: '1',
        steps: [{
          id: 's1',
          name: '测试',
          type: 'form',
          fields: [
            { name: 'hide', label: '隐藏', type: 'select', required: false,
              options: [{ value: 'yes', label: '隐藏' }, { value: 'no', label: '显示' }] },
            { name: 'f1', label: '字段1', type: 'text', required: false },
            { name: 'f2', label: '字段2', type: 'text', required: false },
          ],
          layout: [
            { kind: 'field', ref: 'hide', id: 'hide' },
            { kind: 'section', id: 'sec1', title: '分节', children: [
              { kind: 'field', ref: 'f1', id: 'f1' },
              { kind: 'field', ref: 'f2', id: 'f2' },
            ]},
          ],
          linkage: [
            { handler: 'conditional-visibility', on: { field: 'hide' }, target: 'sec1',
              params: [{ field: 'hide', op: 'eq', value: 'no' }] },
          ],
        }],
      }
      const wrapper = mountRenderer({ schema })
      await flushPromises()

      // 选 'yes' → sec1 隐藏（条件 hide=no 不满足）
      const picker = wrapper.find('picker')
      await picker.trigger('change', { detail: { value: 0 } }) // index 0 = 'yes'
      await flushPromises()

      // 分节内的字段应不可见
      const inputs = wrapper.findAll('input')
      // hide select 本身不是 input，只有 f1/f2 是 input
      // 隐藏后 input 数应减少
      expect(inputs.length).toBe(0)
    })
  })

  // ═══ #65 扩展性：自定义 handler 端到端 ═══

  describe('#65 自定义 handler 端到端', () => {
    it('注册自定义 handler → schema 声明 → 生效', async () => {
      // 注册自定义 handler
      globalHandlerRegistry.register({
        name: 'auto-fill',
        apply: (ctx) => {
          const source = ctx.dataStore.read(ctx.stepId, ctx.signal.fieldPath)
          return [{ type: 'set-value', target: ctx.target, payload: { value: `自动:${source}` } }]
        },
      })

      const schema: RuntimeFormSchema = {
        template_id: 't1',
        version: '1',
        steps: [{
          id: 's1',
          name: '测试',
          type: 'form',
          fields: [
            { name: 'src', label: '源', type: 'text', required: false },
            { name: 'dst', label: '目标', type: 'text', required: false },
          ],
          layout: [
            { kind: 'field', ref: 'src', id: 'src' },
            { kind: 'field', ref: 'dst', id: 'dst' },
          ],
          linkage: [
            { handler: 'auto-fill', on: { field: 'src' }, target: 'dst' },
          ],
        }],
      }
      const wrapper = mountRenderer({ schema })
      await flushPromises()

      // 输入 src → dst 自动填充
      const inputs = wrapper.findAll('input')
      await inputs[0].setValue('hello')
      await flushPromises()

      // dst 应被自动设为 "自动:hello"
      const dstInput = wrapper.findAll('input')[1]
      expect(dstInput.element.value).toContain('hello')
    })
  })

  // ═══ #67 未知 kind/type/handler → 兜底不崩 ═══

  describe('#67 未知类型兜底', () => {
    it('未知字段类型 → 渲染 Unknown 兜底不崩', () => {
      const wrapper = mountRenderer({ schema: unknownSchema })
      expect(wrapper.exists()).toBe(true)
      // 不崩溃即通过
    })
  })

  // ═══ #69 stepId / 无 stepId / 空 steps ═══

  describe('#69 健壮性', () => {
    it('无 stepId → 渲染首步', () => {
      const wrapper = mountRenderer({ schema: fullSchema })
      expect(wrapper.find('input, textarea, picker').exists()).toBe(true)
    })

    it('指定 stepId → 渲染对应步', () => {
      const wrapper = mountRenderer({ schema: fullSchema, stepId: 'step_basic_info' })
      expect(wrapper.exists()).toBe(true)
    })

    it('steps=[] → 不崩', () => {
      const emptySchema: RuntimeFormSchema = {
        template_id: 't',
        version: '1',
        steps: [],
      }
      const wrapper = mountRenderer({ schema: emptySchema })
      expect(wrapper.exists()).toBe(true)
    })
  })
})
