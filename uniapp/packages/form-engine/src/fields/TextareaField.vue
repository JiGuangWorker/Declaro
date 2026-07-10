<!--
  TextareaField.vue
  核心功能：
  - 渲染多行文本输入字段，并把输入结果通过 signal channel 回传给表单引擎。
  - 为小程序原生 textarea 提供稳定布局，避免在 flex 场景下出现占位符、标签、内容错位。
  开发维护：Declaro Team
  创建时间：2026-03-04
  最近更新：2026-07-10
-->
<template>
  <FieldWrap
    :label="renderContext.label"
    :required="required"
    :tips="renderContext.tips"
    :error="renderContext.error"
    vertical-align="top"
  >
    <textarea
      class="field-textarea"
      :value="String(renderContext.value ?? '')"
      :placeholder="renderContext.placeholder"
      placeholder-style="color: #A8B0BE"
      :disabled="isDisabled"
      auto-height
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
 * 处理 textarea 输入事件，并把最新字符串值同步回表单引擎。
 * @param e 原生输入事件对象。
 * @returns 无显式返回值。
 * @remarks uni-app textarea 在多端下都以字符串形式回传，因此这里统一按 string 上送。
 */
function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: target.value })
}
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.field-textarea {
  width: 100%;
  font-size: $font-size-control;
  color: $color-text;
  font-weight: 500;
  min-height: 120rpx;
  height: 120rpx;
  line-height: 1.5;
  box-sizing: border-box;
  text-align: left;
  letter-spacing: 0.5rpx;
  padding: 0;
  margin: 0;
  display: block;
  vertical-align: top;
}
</style>
