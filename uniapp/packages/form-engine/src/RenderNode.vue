<!--
  RenderNode — 递归布局树节点渲染组件。

  按 node.kind 分发：
  - field → 查 ComponentRegistry 渲染对应字段组件
  - section → SectionLayout 包裹子节点
  - row → RowLayout 包裹子节点
  - repeatable → RepeatableLayout + 行 slot（pathPrefix 注入行索引）

  递归引用自身渲染子节点。通过 useRenderTree() inject 获取渲染辅助 API。
  可见性由 api.isNodeVisible 判断（含祖先传播）。
-->
<template>
  <template v-if="visible">
    <!-- field: 按 type 分发到具体字段组件（微信小程序不支持 <component :is>） -->
    <TextField
      v-if="node.kind === 'field' && fieldType === 'text'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <TextareaField
      v-else-if="node.kind === 'field' && fieldType === 'textarea'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <NumberField
      v-else-if="node.kind === 'field' && fieldType === 'number'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <PhoneField
      v-else-if="node.kind === 'field' && fieldType === 'phone'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <IdCardField
      v-else-if="node.kind === 'field' && fieldType === 'id_card'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <DateField
      v-else-if="node.kind === 'field' && fieldType === 'date'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <SelectField
      v-else-if="node.kind === 'field' && fieldType === 'select'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <RadioField
      v-else-if="node.kind === 'field' && fieldType === 'radio'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <CheckboxField
      v-else-if="node.kind === 'field' && fieldType === 'checkbox'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <CascaderField
      v-else-if="node.kind === 'field' && fieldType === 'cascader'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <ImageField
      v-else-if="node.kind === 'field' && fieldType === 'image'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <SignatureField
      v-else-if="node.kind === 'field' && fieldType === 'signature'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <LabelField
      v-else-if="node.kind === 'field' && fieldType === 'label'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />
    <UnknownField
      v-else-if="node.kind === 'field'"
      :render-context="renderContext"
      :field-path="fullFieldPath"
      :required="required"
    />

    <!-- section: SectionLayout 包裹子节点 -->
    <SectionLayout
      v-else-if="node.kind === 'section'"
      :title="node.title"
    >
      <RenderNode
        v-for="child in node.children ?? []"
        :key="childKey(child)"
        :node="child"
        :path-prefix="pathPrefix"
      />
    </SectionLayout>

    <!-- row: RowLayout 包裹子节点 -->
    <RowLayout v-else-if="node.kind === 'row'">
      <RenderNode
        v-for="child in node.children ?? []"
        :key="childKey(child)"
        :node="child"
        :path-prefix="pathPrefix"
      />
    </RowLayout>

    <!-- repeatable: RepeatableLayout + 行 slot -->
    <RepeatableLayout
      v-else-if="node.kind === 'repeatable'"
      :value="tableValue"
      :name="node.name ?? ''"
      :min="node.min"
      :max="node.max"
    >
      <template #default="{ index }">
        <RenderNode
          v-for="child in node.children ?? []"
          :key="`${childKey(child)}-${index}`"
          :node="child"
          :path-prefix="`${node.name ?? ''}[${index}]`"
        />
      </template>
    </RepeatableLayout>

    <!-- 未知 kind: 兜底 -->
    <UnknownField
      v-else
      :render-context="emptyRenderContext"
      :field-path="node.id ?? ''"
    />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutNode, FieldSchema } from './types/engine'
import type { RenderContext } from './types/slots'
import { useRenderTree } from './useRenderTree'
import SectionLayout from './layouts/SectionLayout.vue'
import RowLayout from './layouts/RowLayout.vue'
import RepeatableLayout from './layouts/RepeatableLayout.vue'
// 微信小程序不支持 <component :is>，需显式 import 所有字段组件用 v-if 分发
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

const props = defineProps<{
  node: LayoutNode
  /** repeatable 行内子节点的路径前缀（如 'branches[0]'） */
  pathPrefix?: string
}>()

const api = useRenderTree()

const emptyRenderContext: RenderContext = {
  value: undefined,
  readonly: false,
  disabled: false,
  error: null,
  label: '',
  placeholder: '',
  tips: undefined,
  options: undefined,
  validation: undefined,
}

// ─── 可见性 ───
const visible = computed(() => api.isNodeVisible(props.node.id))

// ─── 字段查表 ───
const fieldSchema = computed<FieldSchema | undefined>(() => {
  if (props.node.kind !== 'field' || !props.node.ref) return undefined
  return api.getFieldSchema(props.node.ref)
})

const fullFieldPath = computed(() => {
  if (!props.node.ref) return ''
  return props.pathPrefix ? `${props.pathPrefix}.${props.node.ref}` : props.node.ref
})

const fieldType = computed(() => fieldSchema.value?.type)

const renderContext = computed(() => {
  const field = fieldSchema.value
  if (!field) return emptyRenderContext
  return api.getRenderContext(field, fullFieldPath.value)
})

const required = computed(() => {
  const field = fieldSchema.value
  if (!field) return false
  return api.getFieldRequired(fullFieldPath.value, field.required)
})

// ─── repeatable 表值 ───
const tableValue = computed(() => {
  if (props.node.kind !== 'repeatable' || !props.node.name) return []
  return api.getTableValue(props.node.name)
})

// ─── 工具 ───
function childKey(child: LayoutNode): string {
  return child.id ?? child.ref ?? child.name ?? ''
}
</script>
