<!--
  RowLayout — 同行布局（children 内联）。
  对应「邮政编码 + 传真」同行多字段，手机端可堆叠。
-->
<template>
  <view class="row-layout">
    <slot />
  </view>
</template>

<script setup lang="ts">
// 纯容器组件，无额外 props
</script>

<style scoped>
.row-layout {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16rpx;
}
</style>
