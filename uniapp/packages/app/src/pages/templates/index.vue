<!-- Copyright (c) 2026 Declaro. All rights reserved. -->
<script setup lang="ts">
// 模板列表页：展示可选材料模板，点击进入填写。
// 后端 Issue #6 完成后改为从 API 获取模板列表，当前用本地 Mock。
import { ref } from 'vue'

interface TemplateItem {
  id: string
  name: string
  desc: string
}

const templates = ref<TemplateItem[]>([
  { id: 'tpl_pesticide_001', name: '农药经营许可申请表', desc: '示范用 Mock 模板（含 13 种字段）' },
])

function selectTemplate(id: string) {
  uni.navigateTo({ url: `/pages/material/fill?template_id=${id}` })
}
</script>

<template>
  <view class="templates">
    <view
      v-for="t in templates"
      :key="t.id"
      class="tpl-card"
      @tap="selectTemplate(t.id)"
    >
      <text class="tpl-name">{{ t.name }}</text>
      <text class="tpl-desc">{{ t.desc }}</text>
    </view>
  </view>
</template>

<style scoped>
.templates {
  padding: 24rpx;
}

.tpl-card {
  display: flex;
  flex-direction: column;
  padding: 32rpx 24rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.tpl-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.tpl-desc {
  font-size: 24rpx;
  color: #999;
}
</style>
