<!--
  UnknownField — 未知字段类型兜底渲染。
  不崩，展示 label + 提示文案。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <view class="unknown-field">
      <text>未知字段类型，无法渲染</text>
    </view>
  </FieldWrap>
</template>

<script lang="ts">
export default { name: 'UnknownRenderer' }
</script>

<script setup lang="ts">
import FieldWrap from '../layouts/FieldWrap.vue'
import type { RenderContext } from '../types/slots'

defineProps<{
  renderContext: RenderContext
  fieldPath: string
  required?: boolean
}>()
</script>

<style scoped>
.unknown-field {
  padding: 16rpx;
  background: #fff3e0;
  color: #e65100;
  font-size: 24rpx;
}
</style>
