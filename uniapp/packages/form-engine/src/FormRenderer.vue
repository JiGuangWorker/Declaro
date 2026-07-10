<!--
  FormRenderer — 渲染引擎根组件。

  职责（设计 §4.1 渲染流程）：
  1. 解析 RuntimeFormSchema → RenderStep（schema-reader）
  2. 初始化 DataStore（extractFieldDefaults）+ SignalRouter（bindings+layout）
  3. provide 三相：EngineChannel（信号收发）+ EngineDataBinding（读写）+ RenderTreeAPI（渲染辅助）
  4. 模板：v-for RenderNode 渲染布局树

  响应性策略：DataStore 是普通 Map，通过 renderTick 版本号触发 Vue 重渲染。
  每次 signalRouter.emit 后 renderTick++，所有 RenderTreeAPI 方法访问 renderTick.value 建立依赖。

  N1 红线：树遍历逻辑抽至 useRenderTree + RenderNode.vue，本文件 ≤300 行。
-->
<template>
  <!-- 微信小程序自定义组件要求单根节点，用外层 view 包裹 -->
  <view class="form-renderer-root">
    <view v-if="currentStep" class="form-renderer">
      <RenderNode
        v-for="node in renderTree"
        :key="nodeKey(node)"
        :node="node"
      />
    </view>
    <view v-else class="form-renderer-empty">
      <text>暂无可渲染步骤</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide } from 'vue'
import { DataStore } from './data-store'
import { SignalRouter, createRenderState } from './signal-router'
import { readStep, extractFieldDefaults, extractLinkage } from './schema-reader'
import { componentRegistry, handlerRegistry } from './component-registry'
import { EngineChannelKey, type EngineChannel } from './slots/useSignalChannel'
import { EngineDataBindingKey, type EngineDataBinding } from './slots/useDataBinding'
import { RenderTreeAPIKey, type RenderTreeAPI, normalizeOptions } from './useRenderTree'
import RenderNode from './RenderNode.vue'
import type { RuntimeFormSchema, RuntimeStep } from './types/engine-runtime'
import type { RenderStep, LayoutNode, FieldSchema } from './types/engine'
import type { RenderContext, FieldMeta } from './types/slots'

const props = defineProps<{
  schema: RuntimeFormSchema
  stepId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  'update:validity': [value: boolean]
}>()

// ─── 引擎内核实例（组件生命周期内单例）───
const dataStore = new DataStore()
const renderState = createRenderState()
const signalRouter = new SignalRouter(dataStore, handlerRegistry, renderState)

// ─── 响应性 tick：DataStore 非 reactive，通过版本号驱动重渲染 ───
const renderTick = ref(0)

// ─── 当前步骤（runtime 原始 + parsed RenderStep）───
const currentRuntimeStep = computed<RuntimeStep | undefined>(() => {
  const steps = props.schema.steps ?? []
  if (steps.length === 0) return undefined
  if (props.stepId) {
    return steps.find((s) => s.id === props.stepId) ?? steps[0]
  }
  return steps[0]
})

const currentStep = computed<RenderStep | undefined>(() => {
  return currentRuntimeStep.value ? readStep(currentRuntimeStep.value) : undefined
})

const fieldMap = computed<Map<string, FieldSchema>>(() => {
  const map = new Map<string, FieldSchema>()
  for (const f of currentStep.value?.fields ?? []) {
    map.set(f.name, f)
  }
  return map
})

const renderTree = computed<LayoutNode[]>(() => {
  void renderTick.value // 建立响应式依赖
  return currentStep.value?.layout ?? []
})

// ─── 步骤初始化：DataStore defaults + SignalRouter bindings ───
watch(
  currentStep,
  (step) => {
    if (!step) return
    const defaults = extractFieldDefaults(step)
    dataStore.initStep(step.id, defaults)
    const bindings = currentRuntimeStep.value ? extractLinkage(currentRuntimeStep.value) : []
    signalRouter.initStep(step.id, bindings, step.layout ?? [])
    renderTick.value++
    emitCurrentData()
  },
  { immediate: true },
)

// ─── provide EngineChannel（通信解耦相）───
const engineChannel: EngineChannel = {
  emit(signal) {
    const step = currentStep.value
    if (!step) return
    signalRouter.emit(signal)
    renderTick.value++
    emitCurrentData()
  },
  on(type, handler) {
    return signalRouter.on(type, handler)
  },
}
provide(EngineChannelKey, engineChannel)

// ─── provide EngineDataBinding（数据绑定相）───
const engineDataBinding: EngineDataBinding = {
  read(fieldPath) {
    void renderTick.value
    const step = currentStep.value
    const value = step ? dataStore.read(step.id, fieldPath) : undefined
    const baseName = fieldPath.match(/^[^[\]]+\[\d+\]\.(.+)$/)?.[1] ?? fieldPath
    const field = fieldMap.value.get(baseName)
    const meta: FieldMeta = {
      required: renderState.required.get(fieldPath) ?? field?.required ?? false,
    }
    return { value, meta }
  },
  write(change) {
    const step = currentStep.value
    if (!step) return
    signalRouter.emit({ type: 'change', fieldPath: change.fieldPath, payload: change.value })
    renderTick.value++
    emitCurrentData()
  },
}
provide(EngineDataBindingKey, engineDataBinding)

// ─── provide RenderTreeAPI（渲染辅助，RenderNode inject）───
const renderTreeAPI: RenderTreeAPI = {
  getRenderContext(field, fieldPath) {
    void renderTick.value
    const step = currentStep.value
    const value = step ? dataStore.read(step.id, fieldPath) : undefined
    return {
      value,
      readonly: false,
      disabled: renderState.disabled.get(fieldPath) ?? false,
      error: renderState.error.get(fieldPath) ?? null,
      label: field.label,
      placeholder: field.placeholder ?? '',
      tips: field.tips,
      options: normalizeOptions(field.options),
      validation: field.validation,
    } satisfies RenderContext
  },
  isNodeVisible(nodeId) {
    void renderTick.value
    if (!nodeId) return true
    return signalRouter.isNodeVisible(nodeId)
  },
  getTableValue(tableName) {
    void renderTick.value
    const step = currentStep.value
    if (!step) return []
    const val = dataStore.read(step.id, tableName)
    return Array.isArray(val) ? (val as Record<string, unknown>[]) : []
  },
  getComponent(type) {
    return componentRegistry.get(type)
  },
  getFieldRequired(fieldPath, fallbackRequired) {
    void renderTick.value
    return renderState.required.get(fieldPath) ?? fallbackRequired
  },
  getFieldSchema(ref) {
    return fieldMap.value.get(ref)
  },
}
provide(RenderTreeAPIKey, renderTreeAPI)

// ─── 内部工具 ───
function nodeKey(node: LayoutNode): string {
  return node.id ?? node.ref ?? node.name ?? ''
}

function emitCurrentData(): void {
  const step = currentStep.value
  if (!step) return
  emit('update:modelValue', dataStore.getStepData(step.id))
}
</script>

<style scoped>
.form-renderer {
  width: 100%;
}
.form-renderer-empty {
  padding: 32rpx;
  text-align: center;
  color: #999;
}
</style>
