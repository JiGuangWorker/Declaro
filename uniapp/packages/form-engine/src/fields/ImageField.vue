<!--
  ImageField — 图片上传。
  调 uni.chooseImage 选图 → emit string[] (tempFilePaths)。
  支持预览：uni.previewImage。
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <view class="image-field">
      <view class="image-list">
        <view
          v-for="(path, idx) in imagePaths"
          :key="idx"
          class="image-item"
          @click="preview(idx)"
        >
          <image :src="path" mode="aspectFill" class="image-thumb" />
        </view>
      </view>
      <view
        v-if="!isMax"
        class="choose-btn"
        data-action="choose"
        @click="chooseImage"
      >
        <text>+ 添加图片</text>
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

<style scoped>
.image-list {
  display: flex;
  flex-wrap: wrap;
}
.image-item {
  margin: 8rpx;
}
.image-thumb {
  width: 160rpx;
  height: 160rpx;
}
.choose-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
