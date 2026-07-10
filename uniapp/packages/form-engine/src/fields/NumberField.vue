<!--
  NumberField.vue
  核心功能：
  - 渲染数字输入框，并把输入内容转换为 number 或空字符串后同步回表单引擎。
  - 保持与其它单行输入字段一致的宽度与排版，避免样式类名不匹配导致控件塌陷。
  开发维护：Declaro Team
  创建时间：2026-03-04
  最近更新：2026-07-10
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <input
      class="field-input"
      :value="renderContext.value == null ? '' : String(renderContext.value)"
      :placeholder="renderContext.placeholder"
      placeholder-style="color: #A8B0BE"
      :disabled="isDisabled"
      type="number"
      @input="onInput"
    />
  </FieldWrap>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldWrap from '../layouts/FieldWrap.vue'
import { useSignalChannel } from '../slots'
import type { RenderContext } from '../types/slots'

const props = defineProps<{
  renderContext: RenderContext
  fieldPath: string
  required?: boolean
}>()

const channel = useSignalChannel(props.fieldPath)
const isDisabled = computed(() => props.renderContext.disabled || props.renderContext.readonly)

/**
 * 处理数字输入事件，并把值规范化后同步回表单引擎。
 * @param e 原生输入事件对象。
 * @returns 无显式返回值。
 * @remarks 空串必须保持为空串，避免用户清空输入框时被错误转换成 0。
 */
function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  const num = target.value === '' ? '' : Number(target.value)
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: num })
}
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.field-input {
  width: 100%;
  font-size: $font-size-control;
  color: $color-text;
  font-weight: 500;
  text-align: left;
  line-height: 1.4;
  letter-spacing: 0.5rpx;
}
</style>
