<!--
  ImageField — 图片上传。
  消费三相插槽：RenderContext(prop) + useSignalChannel(emit)。
  调 uni.chooseImage 选图 → emit string[] (tempFilePaths)。
  支持预览：uni.previewImage。
  视觉：列表式表单，缩略图网格 + dashed 添加按钮。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <view class="image-field">
      <view class="image-grid" v-if="imagePaths.length">
        <view
          v-for="(path, idx) in imagePaths"
          :key="idx"
          class="image-grid__item"
          @click="preview(idx)"
        >
          <image :src="path" mode="aspectFill" class="image-grid__thumb" />
        </view>
      </view>
      <view
        v-if="!isMax"
        class="image-add"
        :class="{ 'image-add--disabled': isDisabled }"
        data-action="choose"
        @click="chooseImage"
      >
        <view class="image-add__inner">
          <text class="image-add__icon">+</text>
          <text class="image-add__text">上传图片</text>
          <text class="image-add__hint">支持拍照或相册选择</text>
        </view>
      </view>
    </view>
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

const imagePaths = computed<string[]>(() => {
  const v = props.renderContext.value
  return Array.isArray(v) ? v.map(String) : []
})

const isDisabled = computed(() => props.renderContext.disabled || props.renderContext.readonly)

const isMax = computed(() => {
  const maxLen = props.renderContext.validation?.max_length
  return maxLen !== undefined && imagePaths.value.length >= maxLen
})

function chooseImage(): void {
  uni.chooseImage({
    count: 9,
    success: (res: { tempFilePaths: string[] }) => {
      const all = [...imagePaths.value, ...res.tempFilePaths]
      channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: all })
    },
  })
}

function preview(idx: number): void {
  uni.previewImage({
    urls: imagePaths.value,
    current: imagePaths.value[idx],
  })
}
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.image-field {
  display: flex;
  flex-direction: column;
  padding: 4rpx 0;
}

.image-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.image-grid__item {
  width: 160rpx;
  height: 160rpx;
  margin-right: $space-sm;
  margin-bottom: $space-sm;
  border-radius: $radius-sm;
  overflow: hidden;
  background-color: $color-bg-fill;
  border: 2rpx solid $color-border-light;
}

.image-grid__thumb {
  width: 100%;
  height: 100%;
}

.image-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220rpx;
  height: 156rpx;
  border: 2rpx dashed $color-border;
  border-radius: $radius-md;
  background-color: $color-bg-fill;
}

.image-add--disabled {
  opacity: 0.6;
}

.image-add__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-add__icon {
  font-size: 34rpx;
  line-height: 1;
  color: $color-text-link;
  margin-bottom: 10rpx;
}

.image-add__text {
  font-size: $font-size-sm;
  color: $color-text;
  font-weight: 500;
  letter-spacing: 1rpx;
}

.image-add__hint {
  margin-top: 8rpx;
  font-size: $font-size-xs;
  color: $color-text-placeholder;
  line-height: 1.4;
}
</style>
