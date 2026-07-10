<!--
  签名页面 — 独立页面，通过 uni.navigateTo 跳转。
  确认签名后通过 eventChannel 回传 data-url，然后 navigateBack。
-->
<template>
  <view class="sign-page">
    <view class="sign-page__canvas-wrap">
      <SignBoard
        ref="signBoardRef"
        width="100%"
        height="100%"
        stroke-color="#333333"
        :stroke-width="6"
        background-color="#FFFFFF"
      />
    </view>
    <view class="sign-page__footer">
      <view class="sign-page__btn sign-page__btn--ghost" @click="onCancel">
        <text>取消</text>
      </view>
      <view class="sign-page__btn sign-page__btn--ghost" @click="onClear">
        <text>清空</text>
      </view>
      <view class="sign-page__btn sign-page__btn--primary" @click="onConfirm">
        <text>确认签名</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SignBoard from '@declaro/form-engine/src/components/SignBoard.vue'

const signBoardRef = ref<InstanceType<typeof SignBoard> | null>(null)
let eventChannel: { emit: (event: string, data?: unknown) => void } | null = null

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { getOpenerEventChannel?: () => unknown }
  if (currentPage?.getOpenerEventChannel) {
    eventChannel = currentPage.getOpenerEventChannel() as { emit: (event: string, data?: unknown) => void }
  }
})

function onCancel(): void {
  uni.navigateBack()
}

function onClear(): void {
  signBoardRef.value?.clear()
}

async function onConfirm(): Promise<void> {
  if (!signBoardRef.value) return
  const { src } = await signBoardRef.value.getImage()
  if (!src || signBoardRef.value.strokeCount === 0) {
    uni.showToast({ title: '请先签名', icon: 'none' })
    return
  }
  if (eventChannel) {
    eventChannel.emit('confirm', src)
  }
  uni.navigateBack()
}
</script>

<style scoped lang="scss">
@use '@declaro/form-engine/src/styles/tokens' as *;

.sign-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $color-bg-page;
}

.sign-page__canvas-wrap {
  flex: 1;
  margin: 32rpx;
  background-color: $color-bg;
  border-radius: $radius-md;
  overflow: hidden;
}

.sign-page__footer {
  display: flex;
  flex-direction: row;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  gap: $space-md;
  background-color: $color-bg;
  border-top: $divider-width solid $color-divider;
}

.sign-page__btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-sm;
  font-size: $font-size-md;
}

.sign-page__btn--ghost {
  background-color: $color-bg-fill;
  color: $color-text;
}

.sign-page__btn--primary {
  background-color: $color-primary;
  color: $color-text-inverse;
}
</style>
