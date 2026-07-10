<!--
  SectionLayout — 分节布局（title + children slot）。
  对应「一、申请人基本情况」整节。
-->
<template>
  <view class="section-layout">
    <view v-if="title" class="section-title">{{ title }}</view>
    <view class="section-body">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<style scoped>
.section-layout {
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #eee;
}
.section-body {
  padding: 16rpx 0;
}
</style>
