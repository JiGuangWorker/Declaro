<!--
  FieldWrap.vue
  核心功能：
  - 统一承载 form-engine 的字段外层布局，负责 label、控件、提示文案、错误文案与分隔线的渲染。
  - 兼容普通单行字段、同行字段以及多行字段三类布局场景，避免小程序原生组件在 flex 下出现错位。
  开发维护：Declaro Team
  创建时间：2026-03-04
  最近更新：2026-07-10

  测试契约（必须保留，layouts.test.ts 断言）：
  - .required-star — required=true 时存在，false 时不存在
  - .field-tips — 有 tips 时存在，无 tips 时不存在
  - .field-error — error 非 null 时存在，null 时不存在
  - .field-label — label 容器
  - .field-control — 控件容器
-->
<template>
  <view class="field-wrap" :class="fieldWrapClasses">
    <view class="field-body">
      <view v-if="label" class="field-label">
        <text v-if="required" class="required-star">*</text>
        <text class="field-label-text">{{ label }}</text>
      </view>
      <view class="field-control">
        <slot />
      </view>
    </view>
    <view v-if="tips" class="field-tips">{{ tips }}</view>
    <view v-if="error !== null" class="field-error">{{ error }}</view>
    <view v-if="!inRow" class="field-divider"></view>
  </view>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'

/**
 * FieldWrap 组件输入参数。
 * @param label 字段标签文本；为空时不渲染左侧标签区域。
 * @param required 当前字段是否必填；为 true 时显示红色星号。
 * @param tips 当前字段的提示信息；存在时渲染在字段主体下方。
 * @param error 当前字段的错误文案；显式传入 null 时隐藏错误区域。
 * @param verticalAlign 控制 label 与控件的纵向对齐方式；top 用于 textarea / 选项组等多行内容。
 * @returns Vue props 定义结果，供模板与样式联动使用。
 * @remarks 这里不直接判断字段类型，而是由各字段组件显式声明布局模式，避免布局层与业务字段类型耦合。
 */
const props = withDefaults(defineProps<{
  label?: string
  required?: boolean
  tips?: string
  error?: string | null
  verticalAlign?: 'center' | 'top'
}>(), {
  verticalAlign: 'center',
})

const inRowInject = inject<boolean>('inRow', false)
const inRow = computed(() => inRowInject)

/**
 * 根据是否处于同行布局、是否需要顶对齐，生成最终 class。
 * @returns 模板使用的 class map。
 * @remarks 该计算属性把布局状态集中收口，避免模板中散落多处条件判断。
 */
const fieldWrapClasses = computed<Record<string, boolean>>(() => ({
  'field-wrap--in-row': inRow.value,
  'field-wrap--top-aligned': props.verticalAlign === 'top',
}))
</script>

<style scoped lang="scss">
@use '../styles/tokens' as *;

.field-wrap {
  display: flex;
  flex-direction: column;
  background-color: $color-bg;
  box-sizing: border-box;
}

// 同行布局内不再绘制自身底线，由 RowLayout 统一绘制整行分隔线。
.field-wrap--in-row {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

// 同行布局改为「标签在上、控件在下」，避免两列场景下横向空间不足导致的文字串行和箭头换行。
.field-wrap--in-row .field-body {
  flex-direction: column;
  align-items: flex-start;
}

.field-wrap--in-row .field-label {
  width: 100%;
  min-height: auto;
  margin-right: 0;
  margin-bottom: $space-xs;
  padding-top: 0;
}

.field-wrap--in-row .field-control {
  width: 100%;
}

// 同行第二个字段保留竖向分隔，确保左右字段边界清晰。
.field-wrap--in-row + .field-wrap--in-row {
  margin-left: 0;
}

.field-wrap--in-row + .field-wrap--in-row .field-body {
  border-left: $divider-width solid $color-divider-strong;
  padding-left: $space-md;
}

// 默认单行字段保持「左标签 + 右控件」横向结构。
.field-body {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  padding: $cell-padding-v $cell-padding-h;
  box-sizing: border-box;
}

.field-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  width: $label-width;
  margin-right: $label-gap;
  min-height: $control-height;
  padding-top: 0;
  box-sizing: border-box;
  min-width: 0;
}

// 多行字段显式切换为顶对齐，避免 textarea / 选项组被垂直居中后出现视觉塌陷。
.field-wrap--top-aligned .field-body {
  align-items: flex-start;
}

.field-wrap--top-aligned .field-label {
  min-height: auto;
  align-items: flex-start;
  padding-top: 6rpx;
}

.required-star {
  color: $color-error;
  font-size: $font-size-control;
  margin-right: 4rpx;
  line-height: 1;
}

.field-label-text {
  font-size: $font-size-label;
  color: $color-text;
  line-height: 1.32;
  font-weight: 500;
  word-break: keep-all;
}

.field-control {
  flex: 1;
  min-height: $control-height;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-width: 0;
  box-sizing: border-box;
}

.field-wrap--top-aligned .field-control {
  align-items: flex-start;
  padding-top: 4rpx;
}

// tips / error 放在下方，整行宽度
.field-tips {
  margin-top: $space-xs;
  padding: 0 $cell-padding-h $cell-padding-v;
  font-size: $font-size-tips;
  color: $color-text-secondary;
  line-height: 1.4;
  box-sizing: border-box;
}

.field-error {
  margin-top: $space-xs;
  padding: 0 $cell-padding-h $cell-padding-v;
  font-size: $font-size-error;
  color: $color-error;
  line-height: 1.4;
  box-sizing: border-box;
}

// 使用真实分隔 view，让分隔线参与正常文档流，避免微信端对 border 呈现不稳定。
.field-divider {
  width: auto;
  height: $divider-width;
  margin: 0 $cell-padding-h;
  background-color: $color-divider;
  flex-shrink: 0;
  opacity: 0.95;
}
</style>
