<!--
  LabelField — 只读标签（纯展示，不 emit 信号）。
  使用 FieldWrap 渲染 label + 星号，value 作为展示文本。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <view class="label-field">
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
// label 字段不 emit 信号，不使用 useSignalChannel
</script>

<style scoped>
.label-field {
  padding: 8rpx 0;
  font-size: 28rpx;
  color: #333;
}
</style>
