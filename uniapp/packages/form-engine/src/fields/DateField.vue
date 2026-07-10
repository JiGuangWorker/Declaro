<!--
  DateField — 日期选择器（picker mode=date）。
  emit 日期串格式 YYYY-MM-DD。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <picker
      mode="date"
      :value="String(renderContext.value ?? '')"
      :disabled="renderContext.disabled || renderContext.readonly"
      @change="onChange"
    >
      <view class="date-display">{{ renderContext.value || renderContext.placeholder || '请选择日期' }}</view>
    </picker>
  </FieldWrap>
</template>

<script setup lang="ts">
import FieldWrap from '../layouts/FieldWrap.vue'
import { useSignalChannel } from '../slots'
import type { RenderContext } from '../types/slots'

const props = defineProps<{
  renderContext: RenderContext
  fieldPath: string
  required?: boolean
}>()

const channel = useSignalChannel(props.fieldPath)

function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail
  const value = detail?.value ?? ''
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: value })
}
</script>

<style scoped>
.date-display {
  padding: 8rpx 0;
}
</style>
