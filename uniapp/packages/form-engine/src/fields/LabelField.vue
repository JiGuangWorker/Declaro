<!--
  LabelField — 只读标签（纯展示，不 emit 信号）。
  消费三相插槽：RenderContext(prop)。
  使用 FieldWrap 渲染 label + 星号，value 作为展示文本。
  视觉：列表式表单，正文色展示。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <view class="field-value-text">
      <text>{{ renderContext.value }}</text>
    </view>
  </FieldWrap>
</template>

<script setup lang="ts">
import FieldWrap from '../layouts/FieldWrap.vue'
import type { RenderContext } from '../types/slots'

defineProps<{
  renderContext: RenderContext
  fieldPath: string
  required?: boolean
}>()
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.field-value-text {
  width: 100%;
  font-size: $font-size-control;
  color: $color-text;
  line-height: 1.5;
  min-height: $control-height;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
}
</style>
