// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * ComponentRegistry — 组件注册表（与 HandlerRegistry 同构）。
 *
 * register/get/has 接口。13 字段 + 4 布局 + Unknown 兜底。
 * FormRenderer 只查表，不持硬编码映射（零硬编码佐证）。
 * 详见设计 §3.4 双注册表、§4.4 注册流程。
 */
import type { DefineComponent } from 'vue'

// 13 叶子字段组件
import TextField from './fields/TextField.vue'
import TextareaField from './fields/TextareaField.vue'
import NumberField from './fields/NumberField.vue'
import PhoneField from './fields/PhoneField.vue'
import IdCardField from './fields/IdCardField.vue'
import DateField from './fields/DateField.vue'
import SelectField from './fields/SelectField.vue'
import RadioField from './fields/RadioField.vue'
import CheckboxField from './fields/CheckboxField.vue'
import CascaderField from './fields/CascaderField.vue'
import ImageField from './fields/ImageField.vue'
import SignatureField from './fields/SignatureField.vue'
import LabelField from './fields/LabelField.vue'
import UnknownField from './fields/UnknownField.vue'

// 4 布局组件
import SectionLayout from './layouts/SectionLayout.vue'
import RowLayout from './layouts/RowLayout.vue'
import RepeatableLayout from './layouts/RepeatableLayout.vue'
import FieldWrap from './layouts/FieldWrap.vue'

// 便捷 re-export（测试期望从此模块导入 handlerRegistry）
export { handlerRegistry } from './linkage/registry'

export type RegisteredComponent = DefineComponent

/** 13 字段类型 key + 4 布局类型 key */
export const FIELD_TYPE_KEYS = [
  'text', 'textarea', 'number', 'phone', 'id_card', 'date',
  'select', 'radio', 'checkbox', 'cascader', 'image', 'signature', 'label',
] as const

export const LAYOUT_TYPE_KEYS = [
  'field', 'section', 'row', 'repeatable',
] as const

/** 13 字段类型 → Vue 组件映射 */
const fieldComponents: Record<string, RegisteredComponent> = {
  text: TextField as RegisteredComponent,
  textarea: TextareaField as RegisteredComponent,
  number: NumberField as RegisteredComponent,
  phone: PhoneField as RegisteredComponent,
  id_card: IdCardField as RegisteredComponent,
  date: DateField as RegisteredComponent,
  select: SelectField as RegisteredComponent,
  radio: RadioField as RegisteredComponent,
  checkbox: CheckboxField as RegisteredComponent,
  cascader: CascaderField as RegisteredComponent,
  image: ImageField as RegisteredComponent,
  signature: SignatureField as RegisteredComponent,
  label: LabelField as RegisteredComponent,
}

/** 4 布局类型 → Vue 组件映射 */
const layoutComponents: Record<string, RegisteredComponent> = {
  field: FieldWrap as RegisteredComponent,
  section: SectionLayout as RegisteredComponent,
  row: RowLayout as RegisteredComponent,
  repeatable: RepeatableLayout as RegisteredComponent,
}

class ComponentRegistryImpl {
  private components = new Map<string, RegisteredComponent>()
  private _unknown: RegisteredComponent = UnknownField as RegisteredComponent

  register(key: string, component: RegisteredComponent): void {
    this.components.set(key, component)
  }

  /** get：存在返回已注册组件，否则返回 Unknown 兜底 */
  get(key: string): RegisteredComponent {
    return this.components.get(key) ?? this._unknown
  }

  has(key: string): boolean {
    return this.components.has(key)
  }

  /** 清空（测试隔离用） */
  clear(): void {
    this.components.clear()
  }

  /** 设置 Unknown 兜底组件（测试可替换） */
  setUnknown(component: RegisteredComponent): void {
    this._unknown = component
  }
}

/** 全局单例 */
export const componentRegistry = new ComponentRegistryImpl()

/** 测试/重建用工厂 */
export function createComponentRegistry(): ComponentRegistryImpl {
  return new ComponentRegistryImpl()
}

/**
 * 注册内置引擎组件（13 字段 + 4 布局 + Unknown 兜底）。
 * 应用启动单次调用（幂等，重复调用覆盖）。
 */
export function registerEngineComponents(registry: ComponentRegistryImpl): void {
  for (const [key, comp] of Object.entries(fieldComponents)) {
    registry.register(key, comp)
  }
  for (const [key, comp] of Object.entries(layoutComponents)) {
    registry.register(key, comp)
  }
}
