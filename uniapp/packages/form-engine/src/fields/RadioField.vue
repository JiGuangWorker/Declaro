<!--
  RadioField.vue
  核心功能：
  - 渲染单选组，并把用户点击或原生 change 的结果同步回表单引擎。
  - 让选项区稳定贴齐控件区域左侧，避免在小程序布局里退化成居中挤压。
  开发维护：Declaro Team
  创建时间：2026-03-04
  最近更新：2026-07-10
-->
<template>
  <FieldWrap
    :label="renderContext.label"
    :required="required"
    :tips="renderContext.tips"
    :error="renderContext.error"
    vertical-align="top"
  >
    <radio-group class="field-option-host" :disabled="isDisabled" @change="onChange">
      <view class="field-option-group">
        <label
          v-for="opt in options"
          :key="String(opt.value)"
          class="field-option"
          @tap="onTap(opt.value)"
        >
          <view class="radio-icon" :class="{ 'radio-icon--checked': isChecked(opt.value) }">
            <view v-if="isChecked(opt.value)" class="radio-icon__dot" />
          </view>
          <radio
            class="radio-native-hidden"
            :value="String(opt.value)"
            :checked="isChecked(opt.value)"
            :disabled="isDisabled"
          />
          <text class="field-option__label">{{ opt.label }}</text>
        </label>
      </view>
    </radio-group>
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
const options = computed(() => props.renderContext.options ?? [])

/**
 * 判断给定选项是否为当前选中值。
 * @param value 待判断的选项值。
 * @returns true 表示该选项应渲染为选中态，否则返回 false。
 * @remarks 统一转成字符串比较，避免 number / string 混用时选中态丢失。
 */
function isChecked(value: string | number): boolean {
  return String(value) === String(props.renderContext.value)
}

/**
 * 处理点击自定义 label 的场景，并主动向表单引擎发出选中值。
 * @param value 当前被点击的选项值。
 * @returns 无显式返回值。
 * @remarks 某些小程序端对自定义 radio 外壳点击命中不稳定，因此保留手动 emit 兜底。
 */
function onTap(value: string | number): void {
  if (isDisabled.value) return
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: String(value) })
}

/**
 * 处理原生 radio-group change 事件，并把选中值同步回表单引擎。
 * @param e radio-group 的 change 事件对象。
 * @returns 无显式返回值。
 * @remarks 这里与 onTap 并存，目的是同时兼容原生交互与自定义点击壳层。
 */
function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail
  const value = detail?.value ?? ''
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: value })
}
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.field-option-host {
  display: block;
  width: 100%;
}

.field-option-group {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  padding: 6rpx 0;
  box-sizing: border-box;
}

.field-option {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  min-height: 44rpx;
  margin-right: 40rpx;
  margin-bottom: 12rpx;
  box-sizing: border-box;
}

.radio-native-hidden {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  overflow: hidden;
}

.radio-icon {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2rpx solid $color-border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color $transition-fast;
  background-color: $color-bg;
}

.radio-icon--checked {
  border-color: $color-primary;
}

.radio-icon__dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: $color-primary;
}

.field-option__label {
  font-size: $font-size-md;
  color: $color-text;
  margin-left: 12rpx;
  font-weight: 400;
}
</style>
