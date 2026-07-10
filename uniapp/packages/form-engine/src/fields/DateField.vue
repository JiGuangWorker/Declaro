<!--
  DateField.vue
  核心功能：
  - 渲染日期选择器，并把用户选择的日期字符串同步回表单引擎。
  - 保证 picker 在普通布局与同行布局下都占满控件区，避免占位文案换行和箭头掉行。
  开发维护：Declaro Team
  创建时间：2026-03-04
  最近更新：2026-07-10
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <picker
      class="field-picker-host"
      mode="date"
      :value="String(renderContext.value ?? '')"
      :disabled="isDisabled"
      @change="onChange"
    >
      <view class="field-picker">
        <text class="field-picker__value" :class="{ 'field-picker__value--placeholder': !renderContext.value }">{{ renderContext.value || renderContext.placeholder || '请选择日期' }}</text>
        <text class="field-picker__arrow">›</text>
      </view>
    </picker>
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

/**
 * 处理日期选择结果，并把 YYYY-MM-DD 字符串写回表单引擎。
 * @param e picker 的 change 事件对象。
 * @returns 无显式返回值。
 * @remarks uni-app date picker 的结果位于 detail.value，需要兼容 detail 缺失场景。
 */
function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail
  const value = detail?.value ?? ''
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: value })
}
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.field-picker-host {
  display: block;
  width: 100%;
  min-width: 0;
}

.field-picker {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: space-between;
  width: 100%;
  min-height: $control-height;
  min-width: 0;
}

.field-picker__value {
  flex: 1;
  min-width: 0;
  font-size: $font-size-control;
  color: $color-text;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.5rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.field-picker__value--placeholder {
  color: $color-text-placeholder;
  font-weight: 400;
}

.field-picker__arrow {
  flex-shrink: 0;
  font-size: 28rpx;
  color: $color-text-link;
  margin-left: $space-xs;
  line-height: 1;
  transform: rotate(90deg);
  font-weight: 500;
}
</style>
