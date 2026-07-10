<!--
  CheckboxField.vue
  核心功能：
  - 渲染多选组，并把选中结果数组同步回表单引擎。
  - 固定选项区宽度与左对齐行为，避免多选项在控件区中间漂浮。
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
    <checkbox-group class="field-option-host" :disabled="isDisabled" @change="onChange">
      <view class="field-option-group">
        <label
          v-for="opt in options"
          :key="String(opt.value)"
          class="field-option"
        >
          <view class="checkbox-icon" :class="{ 'checkbox-icon--checked': isChecked(opt.value) }">
            <text v-if="isChecked(opt.value)" class="checkbox-icon__check">✓</text>
          </view>
          <checkbox
            class="checkbox-native-hidden"
            :value="String(opt.value)"
            :checked="isChecked(opt.value)"
            :disabled="isDisabled"
          />
          <text class="field-option__label">{{ opt.label }}</text>
        </label>
      </view>
    </checkbox-group>
  </FieldWrap>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldWrap from '../layouts/FieldWrap.vue'
import { useSignalChannel } from '../slots'
import type { RenderContext, FieldOption } from '../types/slots'

const props = defineProps<{
  renderContext: RenderContext
  fieldPath: string
  required?: boolean
}>()

const channel = useSignalChannel(props.fieldPath)
const isDisabled = computed(() => props.renderContext.disabled || props.renderContext.readonly)
const options = computed<FieldOption[]>(() => props.renderContext.options ?? [])
const currentValues = computed(() => {
  const v = props.renderContext.value
  return Array.isArray(v) ? v.map(String) : []
})

/**
 * 判断指定选项当前是否被勾选。
 * @param value 待判断的选项值。
 * @returns true 表示应渲染为选中态，否则返回 false。
 * @remarks 统一按字符串比较，避免表单默认值与选项值类型不一致时状态判断失真。
 */
function isChecked(value: string | number): boolean {
  return currentValues.value.includes(String(value))
}

/**
 * 处理 checkbox-group change 事件，并把最新选中值数组写回表单引擎。
 * @param e checkbox-group 的 change 事件对象。
 * @returns 无显式返回值。
 * @remarks uni-app 会直接返回 string[]，因此这里无需额外做复杂映射。
 */
function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string[] } }).detail
  const values = detail?.value ?? []
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: values })
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

.checkbox-native-hidden {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  overflow: hidden;
}

.checkbox-icon {
  width: 32rpx;
  height: 32rpx;
  border-radius: $radius-xs;
  border: 2rpx solid $color-border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all $transition-fast;
  background-color: $color-bg;
}

.checkbox-icon--checked {
  border-color: $color-primary;
  background-color: $color-primary;
}

.checkbox-icon__check {
  font-size: 18rpx;
  color: $color-text-inverse;
  line-height: 1;
  font-weight: bold;
}

.field-option__label {
  font-size: $font-size-md;
  color: $color-text;
  margin-left: 12rpx;
  font-weight: 400;
}
</style>
