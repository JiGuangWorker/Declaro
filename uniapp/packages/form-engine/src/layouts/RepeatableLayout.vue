<!--
  RepeatableLayout — 可重复子表布局。
  对应「三、分支机构」序号|营业场所|仓储场所 ×N「如有」。
  value=行对象数组，增删行 → emit 新数组。
-->
<template>
  <view class="repeatable-layout">
    <view v-for="(row, idx) in rows" :key="idx" class="repeatable-row">
      <view class="row-header">
        <text class="row-index">第 {{ idx + 1 }} 行</text>
        <view
          v-if="canRemove"
          class="remove-btn"
          data-action="remove-row"
          @click="removeRow(idx)"
        >
          <text>删除</text>
        </view>
      </view>
      <view class="row-content">
        <slot :row="row" :index="idx" />
      </view>
    </view>

    <view
      class="add-btn"
      :class="{ disabled: !canAdd }"
      data-action="add-row"
      @click="canAdd ? addRow() : undefined"
    >
      <text>+ 添加</text>
    </view>
    <view v-if="atMax" class="max-tip">
      <text>已达上限 {{ max }}</text>
    </view>
    <view v-if="belowMin" class="min-tip">
      <text>至少需要 {{ min }} 行</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSignalChannel } from '../slots'

const props = withDefaults(
  defineProps<{
    value: Record<string, unknown>[]
    name: string
    min?: number
    max?: number
  }>(),
  {
    min: 1,
    max: 99,
  },
)

const channel = useSignalChannel(props.name)

const rows = computed(() => Array.isArray(props.value) ? props.value : [])

const canAdd = computed(() => rows.value.length < props.max)
const canRemove = computed(() => rows.value.length > props.min)
const atMax = computed(() => rows.value.length >= props.max)
const belowMin = computed(() => rows.value.length < props.min)

function addRow(): void {
  const newRows = [...rows.value, {}]
  channel.emit({ type: 'change', fieldPath: props.name, payload: newRows })
}

function removeRow(idx: number): void {
  const newRows = rows.value.filter((_, i) => i !== idx)
  channel.emit({ type: 'change', fieldPath: props.name, payload: newRows })
}
</script>

<style scoped>
.repeatable-layout {
  border: 2rpx solid #eee;
  border-radius: 8rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}
.repeatable-row {
  margin-bottom: 16rpx;
  border-bottom: 2rpx solid #f5f5f5;
  padding-bottom: 16rpx;
}
.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.row-index {
  font-size: 28rpx;
  color: #666;
}
.remove-btn {
  color: #ee0a24;
  font-size: 24rpx;
}
.add-btn {
  text-align: center;
  padding: 16rpx;
  border: 2rpx dashed #ccc;
  color: #1989fa;
}
.add-btn.disabled {
  color: #ccc;
  border-color: #eee;
}
.max-tip, .min-tip {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 8rpx;
}
</style>
