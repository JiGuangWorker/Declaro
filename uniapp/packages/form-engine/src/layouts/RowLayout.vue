<!--
  RowLayout.vue
  核心功能：
  - 承载同一行内的多个字段，让字段在同一个表单 cell 中并排显示。
  - 统一管理整行分隔线，避免子字段各自绘制底线后出现重叠或缺失。
  开发维护：Declaro Team
  创建时间：2026-03-04
  最近更新：2026-07-10
-->
<template>
  <view class="row-layout">
    <view class="row-layout__content">
      <slot />
    </view>
    <view class="row-divider"></view>
  </view>
</template>

<script setup lang="ts">
import { provide } from 'vue'

/**
 * 向子孙 FieldWrap 提供同行布局标记。
 * @returns 无显式返回值。
 * @remarks 子字段拿到该标记后会切换为同行专用样式，例如关闭自身底线、改为上下布局等。
 */
provide('inRow', true)
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.row-layout {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  overflow: hidden;
  background-color: $color-bg;
}

.row-layout__content {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  box-sizing: border-box;
  overflow: hidden;
  padding: 0 $cell-padding-h;
}

.row-divider {
  width: auto;
  height: $divider-width;
  margin: 0 $cell-padding-h;
  background-color: $color-divider;
  flex-shrink: 0;
  opacity: 0.95;
}
</style>
