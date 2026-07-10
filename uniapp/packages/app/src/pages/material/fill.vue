<!-- Copyright (c) 2026 Declaro. All rights reserved. -->
<script setup lang="ts">
// 材料填写页：接入 @declaro/form-engine 渲染 Mock schema。
// FormRenderer 通过 easycom 自动注册（pages.json 配置），不需要 import。
// 后端 Issue #6 完成后改为从 API 获取 schema，当前用本地 Mock 做冒烟测试。
import { ref } from 'vue'
import {
  componentRegistry,
  registerEngineComponents,
  handlerRegistry,
  registerBuiltins,
} from '@declaro/form-engine'
import { mockFormSchema } from '../../mock/form-schema'

// 引擎注册（幂等，全局单例，应用启动单次调用即可）
registerEngineComponents(componentRegistry)
registerBuiltins(handlerRegistry)

const schema = ref(mockFormSchema)
const stepId = ref(mockFormSchema.steps[0]?.id ?? '')
</script>

<template>
  <view class="fill-page">
    <FormRenderer :schema="schema" :step-id="stepId" />
  </view>
</template>

<style scoped>
.fill-page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f5f5f5;
}
</style>
