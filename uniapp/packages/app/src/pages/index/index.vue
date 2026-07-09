<!-- Copyright (c) 2026 Declaro. All rights reserved. -->
<script setup lang="ts">
// 首页占位：具体内容见后续 Issue
function goTemplates() {
  uni.navigateTo({ url: '/pages/templates/index' })
}
function goExport() {
  uni.navigateTo({ url: '/pages/export/index' })
}
</script>

<template>
  <view class="page">
    <view class="title">Declaro 材料制作平台</view>
    <view class="actions">
      <button type="primary" @click="goTemplates">开始制作材料</button>
      <button @click="goExport">导出 / 任务中心</button>
    </view>
  </view>
</template>

<style scoped>
.page {
  padding: 48rpx 32rpx;
}
.title {
  font-size: 40rpx;
  font-weight: 600;
  margin-bottom: 48rpx;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
</style>
