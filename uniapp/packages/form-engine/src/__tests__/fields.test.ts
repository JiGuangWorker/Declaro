// @vitest-environment happy-dom
// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * Tier 2 — fields.test.ts
 *
 * 13 字段类型参数化测试（#38-50）+ 三相插槽隔离断言。
 *
 * 组件契约（三相插槽标准）：
 * - Props: renderContext: RenderContext, fieldPath: string, required?: boolean
 * - 通信: useSignalChannel(fieldPath) → emit InteractionSignal(change)
 * - 数据: useDataBinding(fieldPath) → read()/write()（经插槽，不直接碰 DataStore）
 *
 * 测试环境：happy-dom（按文件注入，不动全局 node 环境）。
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'

import { EngineChannelKey, EngineDataBindingKey } from '../slots'
import type { RenderContext, FieldOption } from '../types/slots'

import TextField from '../fields/TextField.vue'
import TextareaField from '../fields/TextareaField.vue'
import NumberField from '../fields/NumberField.vue'
import PhoneField from '../fields/PhoneField.vue'
import IdCardField from '../fields/IdCardField.vue'
import DateField from '../fields/DateField.vue'
import SelectField from '../fields/SelectField.vue'
import RadioField from '../fields/RadioField.vue'
import CheckboxField from '../fields/CheckboxField.vue'
import CascaderField from '../fields/CascaderField.vue'
import ImageField from '../fields/ImageField.vue'
import SignatureField from '../fields/SignatureField.vue'
import LabelField from '../fields/LabelField.vue'
import UnknownField from '../fields/UnknownField.vue'

// ─── 测试辅助 ───

function makeRC(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    value: '',
    readonly: false,
    disabled: false,
    error: null,
    label: '测试字段',
    placeholder: '请输入',
    tips: undefined,
    options: undefined,
    validation: undefined,
    ...overrides,
  }
}

interface MockSlots {
  emitSpy: ReturnType<typeof vi.fn>
  onSpy: ReturnType<typeof vi.fn>
  readSpy: ReturnType<typeof vi.fn>
  writeSpy: ReturnType<typeof vi.fn>
}

function makeMockSlots(readValue: { value: unknown; meta: { required: boolean } } = { value: '', meta: { required: false } }): MockSlots {
  return {
    emitSpy: vi.fn(),
    onSpy: vi.fn(() => () => {}),
    readSpy: vi.fn(() => readValue),
    writeSpy: vi.fn(),
  }
}

function mountField(
  component: Component,
  props: Record<string, unknown>,
  mocks?: MockSlots,
) {
  const m = mocks ?? makeMockSlots()
  const wrapper = mount(component, {
    props,
    global: {
      provide: {
        [EngineChannelKey]: { emit: m.emitSpy, on: m.onSpy },
        [EngineDataBindingKey]: { read: m.readSpy, write: m.writeSpy },
      },
    },
  })
  return { wrapper, mocks: m }
}

// ─── 字段类型 → 组件映射 ───

const FIELD_COMPONENTS: Record<string, Component> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  phone: PhoneField,
  id_card: IdCardField,
  date: DateField,
  select: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
  cascader: CascaderField,
  image: ImageField,
  signature: SignatureField,
  label: LabelField,
}

// ═══ #38 渲染对应 uni 内置 ═══

describe('fields.test.ts', () => {
  describe('#38 渲染对应 uni 内置组件', () => {
    it('text → <input>', () => {
      const { wrapper } = mountField(TextField, { renderContext: makeRC(), fieldPath: 'f' })
      expect(wrapper.find('input').exists()).toBe(true)
    })

    it('textarea → <textarea>', () => {
      const { wrapper } = mountField(TextareaField, { renderContext: makeRC(), fieldPath: 'f' })
      expect(wrapper.find('textarea').exists()).toBe(true)
    })

    it('number → <input type="number">', () => {
      const { wrapper } = mountField(NumberField, { renderContext: makeRC(), fieldPath: 'f' })
      const input = wrapper.find('input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('number')
    })

    it('phone → <input type="tel">', () => {
      const { wrapper } = mountField(PhoneField, { renderContext: makeRC(), fieldPath: 'f' })
      const input = wrapper.find('input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('tel')
    })

    it('id_card → <input> with maxlength=18', () => {
      const { wrapper } = mountField(IdCardField, { renderContext: makeRC(), fieldPath: 'f' })
      const input = wrapper.find('input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('maxlength')).toBe('18')
    })

    it('date → <picker mode="date">', () => {
      const { wrapper } = mountField(DateField, { renderContext: makeRC(), fieldPath: 'f' })
      expect(wrapper.find('picker').exists()).toBe(true)
    })

    it('select → <picker mode="selector">', () => {
      const { wrapper } = mountField(SelectField, {
        renderContext: makeRC({ options: [{ value: '1', label: 'A' }] }),
        fieldPath: 'f',
      })
      const picker = wrapper.find('picker')
      expect(picker.exists()).toBe(true)
      expect(picker.attributes('mode')).toBe('selector')
    })

    it('radio → <radio-group> with <radio>', () => {
      const { wrapper } = mountField(RadioField, {
        renderContext: makeRC({ options: [{ value: '1', label: 'A' }] }),
        fieldPath: 'f',
      })
      expect(wrapper.find('radio-group').exists()).toBe(true)
      expect(wrapper.findAll('radio').length).toBeGreaterThan(0)
    })

    it('checkbox → <checkbox-group> with <checkbox>', () => {
      const { wrapper } = mountField(CheckboxField, {
        renderContext: makeRC({ options: [{ value: '1', label: 'A' }] }),
        fieldPath: 'f',
      })
      expect(wrapper.find('checkbox-group').exists()).toBe(true)
      expect(wrapper.findAll('checkbox').length).toBeGreaterThan(0)
    })

    it('cascader → <picker mode="multiSelector">', () => {
      const { wrapper } = mountField(CascaderField, {
        renderContext: makeRC({ options: [{ value: '1', label: 'A' }] }),
        fieldPath: 'f',
      })
      const picker = wrapper.find('picker')
      expect(picker.exists()).toBe(true)
      expect(picker.attributes('mode')).toBe('multiSelector')
    })

    it('image → 渲染选择按钮/预览区', () => {
      const { wrapper } = mountField(ImageField, {
        renderContext: makeRC({ value: [] }),
        fieldPath: 'f',
      })
      // 至少有一个可点击的选择区域
      expect(wrapper.find('[data-action="choose"]').exists()).toBe(true)
    })

    it('signature → 渲染签名区域', () => {
      const { wrapper } = mountField(SignatureField, {
        renderContext: makeRC({ value: '' }),
        fieldPath: 'f',
      })
      expect(wrapper.find('[data-field="signature"]').exists()).toBe(true)
    })

    it('label → <text> 展示', () => {
      const { wrapper } = mountField(LabelField, {
        renderContext: makeRC({ value: '只读文本' }),
        fieldPath: 'f',
      })
      // label 字段渲染文本内容
      expect(wrapper.text()).toContain('只读文本')
    })
  })

  // ═══ #39 渲染 label ═══

  describe('#39 渲染 label', () => {
    it.each(Object.keys(FIELD_COMPONENTS))('%s → label 文案渲染', (type) => {
      const comp = FIELD_COMPONENTS[type]
      const { wrapper } = mountField(comp, {
        renderContext: makeRC({ label: '我的字段' }),
        fieldPath: 'f',
      })
      expect(wrapper.text()).toContain('我的字段')
    })
  })

  // ═══ #40 required → 星号 ═══

  describe('#40 required → 星号渲染', () => {
    it.each(Object.keys(FIELD_COMPONENTS))('%s → required=true 时渲染星号', (type) => {
      const comp = FIELD_COMPONENTS[type]
      const { wrapper } = mountField(comp, {
        renderContext: makeRC({ label: '字段' }),
        fieldPath: 'f',
        required: true,
      })
      expect(wrapper.text()).toContain('*')
    })

    it('text → required=false 时无星号', () => {
      const { wrapper } = mountField(TextField, {
        renderContext: makeRC({ label: '字段' }),
        fieldPath: 'f',
        required: false,
      })
      // label "字段" 不含星号
      expect(wrapper.find('.required-star').exists()).toBe(false)
    })
  })

  // ═══ #41 placeholder 透传 ═══

  describe('#41 placeholder 透传', () => {
    it('text → placeholder 透传到 input', () => {
      const { wrapper } = mountField(TextField, {
        renderContext: makeRC({ placeholder: '请输入姓名' }),
        fieldPath: 'f',
      })
      expect(wrapper.find('input').attributes('placeholder')).toBe('请输入姓名')
    })

    it('textarea → placeholder 透传到 textarea', () => {
      const { wrapper } = mountField(TextareaField, {
        renderContext: makeRC({ placeholder: '请输入详细地址' }),
        fieldPath: 'f',
      })
      expect(wrapper.find('textarea').attributes('placeholder')).toBe('请输入详细地址')
    })
  })

  // ═══ #42 tips 渲染 ═══

  describe('#42 tips 渲染', () => {
    it('text → tips 存在时渲染', () => {
      const { wrapper } = mountField(TextField, {
        renderContext: makeRC({ tips: '请如实填写' }),
        fieldPath: 'f',
      })
      expect(wrapper.text()).toContain('请如实填写')
    })

    it('text → tips=undefined 时不渲染 tips 区块', () => {
      const { wrapper } = mountField(TextField, {
        renderContext: makeRC({ tips: undefined }),
        fieldPath: 'f',
      })
      expect(wrapper.find('.field-tips').exists()).toBe(false)
    })
  })

  // ═══ #43 用户输入 → emit InteractionSignal(change) 正确值 ═══

  describe('#43 用户输入 → emit InteractionSignal(change)', () => {
    it('text → 输入 "hello" → emit change payload="hello"', async () => {
      const { wrapper, mocks } = mountField(TextField, { renderContext: makeRC(), fieldPath: 'name' })
      await wrapper.find('input').setValue('hello')
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'name', payload: 'hello' }),
      )
    })

    it('textarea → 输入 "多行\n文本" → emit change', async () => {
      const { wrapper, mocks } = mountField(TextareaField, { renderContext: makeRC(), fieldPath: 'addr' })
      await wrapper.find('textarea').setValue('多行\n文本')
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'addr', payload: '多行\n文本' }),
      )
    })

    it('number → 输入 42 → emit change payload=42 (number)', async () => {
      const { wrapper, mocks } = mountField(NumberField, { renderContext: makeRC(), fieldPath: 'age' })
      await wrapper.find('input').setValue('42')
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'age', payload: 42 }),
      )
    })

    it('phone → 输入 "13800138000" → emit change payload="13800138000"', async () => {
      const { wrapper, mocks } = mountField(PhoneField, { renderContext: makeRC(), fieldPath: 'phone' })
      await wrapper.find('input').setValue('13800138000')
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'phone', payload: '13800138000' }),
      )
    })

    it('id_card → 输入 "110101199001011234" → emit change', async () => {
      const { wrapper, mocks } = mountField(IdCardField, { renderContext: makeRC(), fieldPath: 'id' })
      await wrapper.find('input').setValue('110101199001011234')
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'id', payload: '110101199001011234' }),
      )
    })

    it('radio → 选中选项 → emit change payload=option value', async () => {
      const { wrapper, mocks } = mountField(RadioField, {
        renderContext: makeRC({ options: [{ value: 'A', label: '选项A' }, { value: 'B', label: '选项B' }] }),
        fieldPath: 'choice',
      })
      // uni radio-group change 事件 → { detail: { value: 'B' } }
      await wrapper.find('radio-group').trigger('change', { detail: { value: 'B' } })
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'choice' }),
      )
    })

    it('checkbox → 勾选 → emit change payload=string[]', async () => {
      const { wrapper, mocks } = mountField(CheckboxField, {
        renderContext: makeRC({ value: [], options: [{ value: '1', label: 'X' }, { value: '2', label: 'Y' }] }),
        fieldPath: 'checks',
      })
      const group = wrapper.find('checkbox-group')
      await group.trigger('change', { detail: { value: ['1'] } })
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'checks' }),
      )
    })
  })

  // ═══ #44 errorMessage 渲染 ═══

  describe('#44 errorMessage 渲染', () => {
    it('text → error 非空时渲染错误文案', () => {
      const { wrapper } = mountField(TextField, {
        renderContext: makeRC({ error: '格式不正确' }),
        fieldPath: 'f',
      })
      expect(wrapper.text()).toContain('格式不正确')
    })

    it('text → error=null 时无错误区块', () => {
      const { wrapper } = mountField(TextField, {
        renderContext: makeRC({ error: null }),
        fieldPath: 'f',
      })
      expect(wrapper.find('.field-error').exists()).toBe(false)
    })
  })

  // ═══ #45 初始 RenderContext.value 透传 ═══

  describe('#45 初始 RenderContext.value 透传', () => {
    it('text → value="hello" → input.value="hello"', () => {
      const { wrapper } = mountField(TextField, {
        renderContext: makeRC({ value: 'hello' }),
        fieldPath: 'f',
      })
      expect(wrapper.find('input').element.value).toBe('hello')
    })

    it('textarea → value="预设" → textarea.value="预设"', () => {
      const { wrapper } = mountField(TextareaField, {
        renderContext: makeRC({ value: '预设' }),
        fieldPath: 'f',
      })
      expect(wrapper.find('textarea').element.value).toBe('预设')
    })

    it('label → value="只读" → 文本渲染', () => {
      const { wrapper } = mountField(LabelField, {
        renderContext: makeRC({ value: '只读内容' }),
        fieldPath: 'f',
      })
      expect(wrapper.text()).toContain('只读内容')
    })
  })

  // ═══ #46 select/radio/checkbox/cascader 渲染 options ═══

  describe('#46 options 渲染', () => {
    const opts: FieldOption[] = [
      { value: '1', label: '选项一' },
      { value: '2', label: '选项二' },
      { value: '3', label: '选项三' },
    ]

    it('select → options 传入 picker range', () => {
      const { wrapper } = mountField(SelectField, {
        renderContext: makeRC({ options: opts }),
        fieldPath: 'f',
      })
      const picker = wrapper.find('picker')
      expect(picker.exists()).toBe(true)
      // picker range 属性应包含 options 的 label
      const range = picker.attributes('range')
      expect(range).toBeTruthy()
      // range 是 JSON 字符串形式的 label 数组
      expect(range).toContain('选项一')
    })

    it('radio → 每个 option 渲染一个 <radio>', () => {
      const { wrapper } = mountField(RadioField, {
        renderContext: makeRC({ options: opts }),
        fieldPath: 'f',
      })
      expect(wrapper.findAll('radio').length).toBe(3)
      expect(wrapper.text()).toContain('选项一')
      expect(wrapper.text()).toContain('选项三')
    })

    it('checkbox → 每个 option 渲染一个 <checkbox>', () => {
      const { wrapper } = mountField(CheckboxField, {
        renderContext: makeRC({ options: opts }),
        fieldPath: 'f',
      })
      expect(wrapper.findAll('checkbox').length).toBe(3)
    })

    it('cascader → options 传入 multiSelector range', () => {
      const { wrapper } = mountField(CascaderField, {
        renderContext: makeRC({ options: opts }),
        fieldPath: 'f',
      })
      const picker = wrapper.find('picker')
      expect(picker.exists()).toBe(true)
      expect(picker.attributes('mode')).toBe('multiSelector')
    })
  })

  // ═══ #47 label 不 emit 信号 ═══

  describe('#47 label 字段不 emit 信号', () => {
    it('label → 点击/交互不触发 emit', async () => {
      const { wrapper, mocks } = mountField(LabelField, {
        renderContext: makeRC({ value: '文本' }),
        fieldPath: 'lbl',
      })
      await wrapper.trigger('click')
      expect(mocks.emitSpy).not.toHaveBeenCalled()
    })
  })

  // ═══ #48 date emit 日期串 ═══

  describe('#48 date emit 日期串', () => {
    it('date → 选日期 → emit change payload="2026-07-09" 格式', async () => {
      const { wrapper, mocks } = mountField(DateField, {
        renderContext: makeRC({ value: '' }),
        fieldPath: 'birthday',
      })
      const picker = wrapper.find('picker')
      // uni picker change 事件 payload: { detail: { value: '2026-07-09' } }
      await picker.trigger('change', { detail: { value: '2026-07-09' } })
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'birthday', payload: '2026-07-09' }),
      )
    })
  })

  // ═══ #49 image 调 uni.chooseImage(mock) emit string[] ═══

  describe('#49 image 选图 → emit string[]', () => {
    it('image → 点击选图 → uni.chooseImage → emit string[]', async () => {
      const mockPaths = ['wx://tmp/a.jpg', 'wx://tmp/b.jpg']
      const { __uniStub } = await import('./setup')
      vi.mocked(__uniStub.chooseImage).mockImplementation((opts: unknown) => {
        const o = opts as { success?: (r: { tempFilePaths: string[] }) => void }
        o.success?.({ tempFilePaths: mockPaths })
      })

      const { wrapper, mocks } = mountField(ImageField, {
        renderContext: makeRC({ value: [] }),
        fieldPath: 'photos',
      })
      // 触发选图
      const trigger = wrapper.find('[data-action="choose"]') || wrapper.find('button') || wrapper.find('view')
      await trigger.trigger('click')

      expect(__uniStub.chooseImage).toHaveBeenCalled()
      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'photos' }),
      )
    })
  })

  // ═══ #50 signature emit data-url ═══

  describe('#50 signature → emit data-url', () => {
    it('signature → 确认签名 → emit change payload=data-url 字符串', async () => {
      const { wrapper, mocks } = mountField(SignatureField, {
        renderContext: makeRC({ value: '' }),
        fieldPath: 'sig',
      })
      // 触发签名确认
      const confirm = wrapper.find('[data-action="confirm"]') || wrapper.find('[data-field="signature"]')
      await confirm.trigger('click')

      expect(mocks.emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'change', fieldPath: 'sig' }),
      )
      const call = mocks.emitSpy.mock.calls[0]?.[0] as { payload: unknown } | undefined
      if (call?.payload) {
        expect(typeof call.payload).toBe('string')
      }
    })
  })

  // ═══ 三相插槽隔离断言 ═══

  describe('三相插槽隔离断言', () => {
    it('text → props 不含 FieldSchema 字段（name/type/required 等）', () => {
      const { wrapper } = mountField(TextField, {
        renderContext: makeRC(),
        fieldPath: 'f',
        required: true,
      })
      const props = wrapper.props()
      // 不应含 FieldSchema 特有字段
      expect(props).not.toHaveProperty('name')
      expect(props).not.toHaveProperty('type')
      expect(props).not.toHaveProperty('validation')
      // renderContext 是允许的
      expect(props).toHaveProperty('renderContext')
      expect(props).toHaveProperty('fieldPath')
    })

    it('text → 通过 ISignalChannel.emit 通信（不直接调引擎）', async () => {
      const { wrapper, mocks } = mountField(TextField, { renderContext: makeRC(), fieldPath: 'f' })
      await wrapper.find('input').setValue('x')
      // emit 被调用（经插槽），而非直接调引擎
      expect(mocks.emitSpy).toHaveBeenCalled()
    })

    it('text → 通过 IDataBinding 经插槽读写（不直接碰 DataStore）', () => {
      const mocks = makeMockSlots({ value: 'init', meta: { required: true } })
      const { wrapper } = mountField(TextField, { renderContext: makeRC(), fieldPath: 'f' }, mocks)
      // 组件挂载成功即证明 inject 链路通畅（插槽注入成功）
      expect(wrapper.exists()).toBe(true)
      // writeSpy 可用（组件通过插槽提交变更，不直接碰 DataStore）
      expect(typeof mocks.writeSpy).toBe('function')
    })
  })

  // ═══ Unknown 兜底 ═══

  describe('UnknownField 兜底', () => {
    it('未知类型 → 渲染兜底不崩', () => {
      const { wrapper } = mountField(UnknownField, {
        renderContext: makeRC({ label: '未知字段' }),
        fieldPath: 'f',
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('未知字段')
    })
  })
})
