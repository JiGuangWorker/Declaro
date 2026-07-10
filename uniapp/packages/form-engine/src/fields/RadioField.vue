<!--
  RadioField — 单选（radio-group + radio）。
  每个 option 渲染一个 <radio>。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <radio-group :disabled="renderContext.disabled || renderContext.readonly" @change="onChange">
      <label v-for="opt in options" :key="String(opt.value)" class="radio-item">
        <radio :value="String(opt.value)" :checked="String(opt.value) === String(renderContext.value)" />
        <text>{{ opt.label }}</text>
      </label>
    </radio-group>
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

function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail
  const value = detail?.value ?? ''
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: value })
}
</script>

<style scoped>
.radio-item {
  display: block;
  margin-bottom: 8rpx;
}
</style>
