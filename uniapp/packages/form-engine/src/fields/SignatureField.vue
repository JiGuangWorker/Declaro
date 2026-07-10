<!--
  SignatureField — 签名字段（列表式 + 页面跳转签名）。
  消费三相插槽：RenderContext(prop) + useSignalChannel(emit)。
  点击 → uni.navigateTo 跳转到独立签名页 → 确认后 eventChannel 回传 data-url。

  默认页面路径：/pages/sign/index（需在 pages.json 中注册）
  可通过 renderContext.signPagePath 自定义页面路径。

  测试契约：
  - data-field="signature" — 签名区标识
  - data-action="confirm" — 确认按钮标识（测试锚点，display:none）
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <view
      class="signature-field"
      :class="{ 'signature-field--empty': !renderContext.value, 'signature-field--filled': !!renderContext.value }"
      data-field="signature"
      @click="openSignPage"
    >
      <template v-if="renderContext.value">
        <image :src="String(renderContext.value)" mode="aspectFit" class="signature-field__thumb" />
        <text class="signature-field__reselect">重新签名</text>
      </template>
      <template v-else>
        <view class="signature-field__empty-content">
          <text class="signature-field__placeholder">请点击签名</text>
          <text class="signature-field__hint">支持手写签名，提交前可重新编辑</text>
        </view>
        <text class="signature-field__arrow">›</text>
      </template>
    </view>
    <!-- 测试锚点：模拟签名确认，直接 emit data-url -->
    <view class="signature-field__test-confirm" data-action="confirm" @click="onTestConfirm" />
  </FieldWrap>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldWrap from '../layouts/FieldWrap.vue'
import { useSignalChannel } from '../slots'
import type { RenderContext } from '../types/slots'

const props = defineProps<{
  renderContext: RenderContext
  fieldPath: string
  required?: boolean
}>()

const channel = useSignalChannel(props.fieldPath)

const isDisabled = computed(() => props.renderContext.disabled || props.renderContext.readonly)
const signPagePath = '/pages/sign/index'

function openSignPage(): void {
  if (isDisabled.value) return
  uni.navigateTo({
    url: signPagePath,
    success: (res) => {
      res.eventChannel.on('confirm', (dataUrl: string) => {
        channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: dataUrl })
      })
    },
  })
}

function onTestConfirm(): void {
  const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: mockDataUrl })
}
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.signature-field {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  min-height: 80rpx;
  padding: 10rpx 18rpx;
  border: 2rpx solid $color-border-light;
  border-radius: $radius-md;
  background-color: $color-bg-fill;
  box-sizing: border-box;
}

.signature-field--empty {
  justify-content: center;
}

.signature-field--filled {
  justify-content: space-between;
}

.signature-field__empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.signature-field__thumb {
  width: 200rpx;
  height: 80rpx;
  border: $border-width solid $color-border-light;
  border-radius: $radius-md;
  background-color: $color-bg-fill;
}

.signature-field__reselect {
  font-size: $font-size-sm;
  color: $color-primary;
  margin-left: $space-sm;
}

.signature-field__placeholder {
  font-size: $font-size-control;
  color: $color-text;
  font-weight: 500;
}

.signature-field__hint {
  margin-top: 8rpx;
  font-size: $font-size-xs;
  color: $color-text-placeholder;
  line-height: 1.4;
}

.signature-field__arrow {
  font-size: 28rpx;
  color: $color-text-link;
  margin-left: $space-xs;
  line-height: 1;
  transform: rotate(90deg);
  font-weight: 500;
}

.signature-field__test-confirm {
  display: none;
}
</style>
