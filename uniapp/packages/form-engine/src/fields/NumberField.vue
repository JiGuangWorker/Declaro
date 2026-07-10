<!--
  NumberField — 数字输入（emit number 类型，非 string）。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <input
      :value="renderContext.value == null ? '' : String(renderContext.value)"
      :placeholder="renderContext.placeholder"
      :disabled="renderContext.disabled || renderContext.readonly"
      type="number"
      @input="onInput"
    />
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

function onInput(e: Event): void {
  const target = e.target as HTMLInputElement
  const num = target.value === '' ? '' : Number(target.value)
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: num })
}
</script>
