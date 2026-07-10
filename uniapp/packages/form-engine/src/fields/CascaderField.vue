<!--
  CascaderField.vue
  核心功能：
  - 渲染级联选择器，并把首列所选项的 value 同步回表单引擎。
  - 统一 picker 的宽度占位与文本溢出策略，保持与日期、普通下拉一致的布局表现。
  开发维护：Declaro Team
  创建时间：2026-03-04
  最近更新：2026-07-10
-->
<template>
  <FieldWrap :label="renderContext.label" :required="required" :tips="renderContext.tips" :error="renderContext.error">
    <picker
      class="field-picker-host"
      mode="multiSelector"
      :range="cascaderRange"
      :value="selectedIndex"
      :disabled="isDisabled"
      @change="onChange"
    >
      <view class="field-picker">
        <text class="field-picker__value" :class="{ 'field-picker__value--placeholder': !selectedLabel }">{{ selectedLabel || renderContext.placeholder || '请选择' }}</text>
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
const options = computed(() => props.renderContext.options ?? [])

const cascaderRange = computed(() => [options.value.map((o) => o.label)])
const selectedIndex = computed(() => {
  const idx = options.value.findIndex((o) => String(o.value) === String(props.renderContext.value))
  return [idx >= 0 ? idx : 0]
})
const selectedLabel = computed(() => {
  const opt = options.value.find((o) => String(o.value) === String(props.renderContext.value))
  return opt?.label ?? ''
})

/**
 * 处理级联选择结果，并把当前列选中的业务值写回表单引擎。
 * @param e picker 的 change 事件对象。
 * @returns 无显式返回值。
 * @remarks 当前实现是单列简化版 multiSelector，因此只读取 indices[0]。
 */
function onChange(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: number[] } }).detail
  const indices = detail?.value ?? []
  const idx = indices[0] ?? 0
  const opt = options.value[idx]
  channel.emit({ type: 'change', fieldPath: props.fieldPath, payload: opt?.value ?? '' })
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
