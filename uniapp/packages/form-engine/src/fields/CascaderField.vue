<!--
  CascaderField — 级联选择（picker mode=multiSelector）。
  简化实现：options 作为多列选择范围。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <picker
      mode="multiSelector"
      :range="cascaderRange"
      :value="selectedIndex"
      :disabled="renderContext.disabled || renderContext.readonly"
      @change="onChange"
    >
      <view class="cascader-display">{{ selectedLabel || renderContext.placeholder || '请选择' }}</view>
    </picker>
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

const options = computed(() => props.renderContext.options ?? [])

// 简化：单列级联（真实级联需多列联动，本切片作占位实现）
const cascaderRange = computed(() => [options.value.map((o) => o.label)])
const selectedIndex = computed(() => {
  const idx = options.value.findIndex((o) => String(o.value) === String(props.renderContext.value))
  return [idx >= 0 ? idx : 0]
})
const selectedLabel = computed(() => {
  const opt = options.value.find((o) => String(o.value) === String(props.renderContext.value))
  return opt?.label ?? ''
})

function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: number[] } }).detail
  const indices = detail?.value ?? []
  const idx = indices[0] ?? 0
  const opt = options.value[idx]
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: opt?.value ?? '' })
}
</script>

<style scoped>
.cascader-display {
  padding: 8rpx 0;
}
</style>
