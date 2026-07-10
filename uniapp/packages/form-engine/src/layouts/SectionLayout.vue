<!--
  SectionLayout.vue
  核心功能：
  - 渲染表单分组标题与分组内容容器，统一承载「标题条 + 白底列表」的结构。
  - 让整体视觉更接近系统表单页面，而不是卡片式表单。
  开发维护：Declaro Team
  创建时间：2026-03-04
  最近更新：2026-07-10
-->
<template>
  <view class="section section-layout">
    <view v-if="title" class="section__title section-title">
      <view class="section__title-inner">
        <view class="section__title-accent"></view>
        <text class="section__title-text">{{ title }}</text>
      </view>
    </view>
    <view class="section__card">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.section {
  margin-bottom: $section-margin-b;
}

.section__title {
  padding: $section-padding-v $section-padding-h;
  background-color: $color-bg-section-title;
  letter-spacing: 1rpx;
}

.section__title-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.section__title-accent {
  width: 8rpx;
  height: 28rpx;
  margin-right: 14rpx;
  border-radius: $radius-pill;
  background-color: rgba($color-primary, 0.72);
  flex-shrink: 0;
}

.section__title-text {
  font-size: $font-size-section-title;
  font-weight: 500;
  color: $color-text;
  line-height: 1.3;
}

.section__card {
  background-color: $color-bg;
  overflow: hidden;
}
</style>
