<!-- Copyright (c) 2026 Declaro. All rights reserved. -->
<template>
  <view class="page">
    <view class="card">
      <view class="logo">D</view>
      <text class="title">Declaro</text>
      <text class="subtitle">材料制作平台</text>

      <view v-if="error" class="error-box">
        <text class="error-text">{{ error }}</text>
      </view>

      <button class="retry-btn" :disabled="loading" :loading="loading" @tap="retry">
        {{ loading ? '登录中...' : '重试登录' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { silentLogin } from '../../store/modules/auth'

const loading = ref(false)
const error = ref('')

async function retry() {
  loading.value = true
  error.value = ''

  try {
    await silentLogin()
    uni.reLaunch({ url: '/pages/index/index' })
  } catch (e) {
    // silentLogin 抛出的是最后一个错误（ApiError 或 Error）
    // ApiError 带 msg/code/httpStatus；普通 Error 只有 message
    error.value = e instanceof Error ? e.message : '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f8f8; }
.card { display: flex; flex-direction: column; align-items: center; padding: 60rpx 48rpx; }
.logo { width: 160rpx; height: 160rpx; line-height: 160rpx; text-align: center; font-size: 72rpx; font-weight: 700; color: #fff; background: #1677ff; border-radius: 32rpx; margin-bottom: 24rpx; }
.title { font-size: 48rpx; font-weight: 600; color: #333; }
.subtitle { margin-top: 12rpx; font-size: 28rpx; color: #999; }
.error-box { margin-top: 48rpx; padding: 24rpx 32rpx; background: #fff2f0; border: 2rpx solid #ffccc7; border-radius: 16rpx; }
.error-text { font-size: 28rpx; color: #ff4d4f; }
.retry-btn { margin-top: 48rpx; width: 400rpx; height: 88rpx; line-height: 88rpx; font-size: 32rpx; color: #fff; background: #1677ff; border-radius: 44rpx; border: none; }
.retry-btn[disabled] { opacity: 0.6; }
</style>
