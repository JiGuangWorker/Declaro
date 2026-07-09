<!-- Copyright (c) 2026 Declaro. All rights reserved. -->
<script setup lang="ts">
// 导出选择页占位：单选/多选/全选 + 拦截提示，见 Issue #17
function goTasks() {
  uni.navigateTo({ url: '/pages/export/tasks' })
}
</script>

<template>
  <view class="placeholder">
    <text>导出选择页（Issue #17 实现）</text>
    <button style="margin-top: 32rpx" @click="goTasks">任务中心</button>
  </view>
</template>

<style scoped>
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #999;
  font-size: 28rpx;
}
</style>
