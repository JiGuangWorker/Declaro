<!--
  IdCardField — 身份证号输入（maxlength=18）。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <input
      :value="String(renderContext.value ?? '')"
      :placeholder="renderContext.placeholder"
      :disabled="renderContext.disabled || renderContext.readonly"
      type="text"
      maxlength="18"
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
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: target.value })
}
</script>
