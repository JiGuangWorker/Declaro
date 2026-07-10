<!--
  IdCardField — 身份证号输入（maxlength=18）。
  消费三相插槽：RenderContext(prop) + useSignalChannel(emit)。
  视觉：列表式表单，无边框，融入 cell 行。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <input
      class="field-input"
      :value="String(renderContext.value ?? '')"
      :placeholder="renderContext.placeholder"
      placeholder-style="color: #A8B0BE"
      :disabled="isDisabled"
      type="text"
      maxlength="18"
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

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: target.value })
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
