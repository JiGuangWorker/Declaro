<!--
  CheckboxField — 多选（checkbox-group + checkbox）。
  value=string[]，emit 更新后的数组。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <checkbox-group :disabled="renderContext.disabled || renderContext.readonly" @change="onChange">
      <label v-for="opt in options" :key="String(opt.value)" class="checkbox-item">
        <checkbox :value="String(opt.value)" :checked="isChecked(opt.value)" />
        <text>{{ opt.label }}</text>
      </label>
    </checkbox-group>
  </FieldWrap>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldWrap from '../layouts/FieldWrap.vue'
import { useSignalChannel } from '../slots'
import type { RenderContext, FieldOption } from '../types/slots'

const props = defineProps<{
  renderContext: RenderContext
  fieldPath: string
  required?: boolean
}>()

const channel = useSignalChannel(props.fieldPath)

const options = computed(() => props.renderContext.options ?? [])
const currentValues = computed(() => {
  const v = props.renderContext.value
  return Array.isArray(v) ? v.map(String) : []
})

function isChecked(value: string | number): boolean {
  return currentValues.value.includes(String(value))
}

function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string[] } }).detail
  const values = detail?.value ?? []
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: values })
}
</script>

<style scoped>
.checkbox-item {
  display: block;
  margin-bottom: 8rpx;
}
</style>
