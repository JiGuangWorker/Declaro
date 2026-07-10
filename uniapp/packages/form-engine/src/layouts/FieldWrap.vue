<!--
  FieldWrap — 字段统一外壳（label + required 星号 + tips + error + slot）。
  13 个叶子字段组件均通过 FieldWrap 组合，保证外壳一致性。
-->
<template>
  <view class="field-wrap">
    <view v-if="label" class="field-label">
      <text v-if="required" class="required-star">*</text>
      <text>{{ label }}</text>
    </view>
    <view v-if="tips" class="field-tips">{{ tips }}</view>
    <view class="field-control">
      <slot />
    </view>
    <view v-if="error" class="field-error">{{ error }}</view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  required?: boolean
  tips?: string
  error?: string | null
}>()
</script>

<style scoped>
.field-wrap {
  margin-bottom: 16rpx;
}
.field-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
}
.required-star {
  color: #ee0a24;
  margin-right: 4rpx;
}
.field-tips {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}
.field-error {
  font-size: 24rpx;
  color: #ee0a24;
  margin-top: 4rpx;
}
</style>
