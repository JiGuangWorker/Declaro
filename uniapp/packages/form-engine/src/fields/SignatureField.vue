<!--
  SignatureField — 手写签名。
  简化实现：点击确认 → emit data-url 字符串。
  真实实现需 canvas 绘制 + toDataURL，本切片作占位。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <view class="signature-field" data-field="signature">
      <view v-if="renderContext.value" class="signature-preview">
        <image :src="String(renderContext.value)" mode="aspectFit" class="signature-img" />
      </view>
      <view v-else class="signature-placeholder">
        <text>点击此处签名</text>
      </view>
      <view class="confirm-btn" data-action="confirm" @click="confirmSignature">
        <text>{{ renderContext.value ? '重新签名' : '确认签名' }}</text>
      </view>
    </view>
  </FieldWrap>
</template>

<script setup lang="ts">
import FieldWrap from '../layouts/FieldWrap.vue'
import { useSignalChannel } from '../slots'
import type { RenderContext } from '../types/slots'

const props = defineProps<{
  renderContext: RenderContext
  fieldPath: string
  required?: boolean
}>()

const channel = useSignalChannel(props.fieldPath)

function confirmSignature(): void {
  // 简化：emit data-url 占位串（真实实现需 canvas.toDataURL）
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: dataUrl })
}
</script>

<style scoped>
.signature-field {
  border: 2rpx solid #ddd;
  min-height: 200rpx;
}
.signature-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200rpx;
  color: #999;
}
.signature-img {
  width: 100%;
  height: 200rpx;
}
.confirm-btn {
  padding: 16rpx;
  text-align: center;
  border-top: 2rpx solid #eee;
}
</style>
