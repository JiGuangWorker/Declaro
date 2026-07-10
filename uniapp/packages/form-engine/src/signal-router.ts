// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * SignalRouter — 内核管道：信号路由 + 不动点迭代 + applyEffects。
 *
 * 合并原 FieldEventBus + EffectApplier 职责（设计 §3.2）：
 * 1. 接收 InteractionSignal → 写 DataStore
 * 2. 路由至匹配的 LinkageBinding → 查 HandlerRegistry → handler.apply → 收集 Effect[]
 * 3. applyEffects：转译为 SystemEvent 派发 + 修改 RenderState
 * 4. set-value 回写 DataStore → 重发 change（级联）
 * 5. 不动点迭代：D_max=10 + effect 序列签名防环
 *
 * 内核不含联动逻辑——所有逻辑在可注册 handler 里（设计 §3.4）。
 */
import type { DataStore } from './data-store'
import type { LinkageBinding, Effect } from './linkage/types'
import type { HandlerRegistryImpl } from './linkage/registry'
import type {
  InteractionSignal,
  SystemEvent,
  SystemEventType,
  Unsubscribe,
} from './types/slots'
import type {
  RenderState,
  RenderStep,
  LayoutNode,
  FieldSchema,
  ValidationResult,
} from './types/engine'

/** set-value Effect 的精确类型（applyEffects 返回值，用于级联信号生成） */
type SetValueEffect = Extract<Effect, { type: 'set-value' }>

const D_MAX = 10

// ─── RenderState 工厂 ───

export function createRenderState(): RenderState {
  return {
    visibility: new Map(),
    required: new Map(),
    options: new Map(),
    error: new Map(),
    disabled: new Map(),
    __linkageHalt: null,
  }
}

// ─── SignalRouter ───

export class SignalRouter {
  private stepId = ''
  private bindings: LinkageBinding[] = []
  private layout: LayoutNode[] = []
  private subscribers = new Map<SystemEventType, Set<(event: SystemEvent) => void>>()

  constructor(
    private dataStore: DataStore,
    private handlerRegistry: HandlerRegistryImpl,
    private renderState: RenderState,
  ) {}

  /** 初始化步骤上下文 + 评估初始联动状态 */
  initStep(stepId: string, bindings: LinkageBinding[], layout: LayoutNode[]): void {
    this.stepId = stepId
    this.bindings = bindings
    this.layout = layout
    this.renderState.__linkageHalt = null
    // 初始联动评估：用当前 DataStore 值跑一遍所有 binding，设置初始可见性/必填等
    this.evaluateInitial()
  }

  /** 初始评估：对每个 binding 的 on.field 生成合成信号 → route → applyEffects（不级联） */
  private evaluateInitial(): void {
    const evaluatedFields = new Set<string>()
    const allEffects: Effect[] = []
    for (const binding of this.bindings) {
      const field = binding.on.field
      if (evaluatedFields.has(field)) continue // 同字段多个 binding 只跑一次
      evaluatedFields.add(field)
      const value = this.dataStore.read(this.stepId, field)
      const signal: InteractionSignal = { type: 'change', fieldPath: field, payload: value }
      allEffects.push(...this.route(signal))
    }
    // applyEffects 但不级联 set-value（初始状态评估，级联留给用户交互）
    this.applyEffects(allEffects)
  }

  /** 订阅 SystemEvent */
  on(type: SystemEventType, handler: (event: SystemEvent) => void): Unsubscribe {
    let set = this.subscribers.get(type)
    if (!set) {
      set = new Set()
      this.subscribers.set(type, set)
    }
    set.add(handler)
    return () => set!.delete(handler)
  }

  /** emit InteractionSignal → 写 DataStore → 不动点迭代 */
  emit(signal: InteractionSignal): void {
    // 1. 写 DataStore
    this.dataStore.write(this.stepId, signal.fieldPath, signal.payload)
    // 2. 不动点迭代
    this.fixpoint(signal)
  }

  // ─── 内核：不动点迭代 ───

  private fixpoint(initialSignal: InteractionSignal): void {
    let signals: InteractionSignal[] = [initialSignal]
    let depth = 0
    const effectSigs: string[] = []

    while (signals.length > 0) {
      if (depth > D_MAX) {
        this.reportHalt('depth-exceeded', depth, effectSigs)
        return
      }

      // 路由所有信号 → 收集 effects
      const allEffects: Effect[] = []
      for (const sig of signals) {
        const effects = this.route(sig)
        allEffects.push(...effects)
      }

      // effect 序列签名（循环检测）
      const sig = this.effectSignature(allEffects)
      if (sig && effectSigs.includes(sig)) {
        this.reportHalt('cycle-detected', depth, effectSigs)
        return
      }
      effectSigs.push(sig)

      // applyEffects → 派发 SystemEvent + 修改 RenderState
      const setValueEffects = this.applyEffects(allEffects)

      // set-value → 生成新信号（级联）
      signals = setValueEffects.map((e) => ({
        type: 'change' as const,
        fieldPath: e.target,
        payload: e.payload.value,
      }))

      depth++
    }
  }

  /** 路由单个信号 → 匹配 bindings → 查 handler → apply → 收集 Effect[] */
  private route(signal: InteractionSignal): Effect[] {
    const effects: Effect[] = []
    for (const binding of this.bindings) {
      if (binding.on.field !== signal.fieldPath) continue
      const handler = this.handlerRegistry.get(binding.handler)
      if (!handler) continue // C4: 未知 handler 静默跳过
      const result = handler.apply({
        signal,
        dataStore: this.dataStore,
        stepId: this.stepId,
        params: binding.params,
        target: binding.target,
      })
      effects.push(...result)
    }
    return effects
  }

  /** applyEffects：修改 RenderState + 派发 SystemEvent → 返回 set-value effects（用于级联） */
  private applyEffects(effects: Effect[]): SetValueEffect[] {
    const setValueEffects: SetValueEffect[] = []
    for (const effect of effects) {
      switch (effect.type) {
        case 'set-visibility':
          this.renderState.visibility.set(effect.target, effect.payload.visible)
          this.dispatch({
            type: 'visibility-change',
            payload: { nodeId: effect.target, visible: effect.payload.visible },
          })
          break
        case 'set-required':
          this.renderState.required.set(effect.target, effect.payload.required)
          this.dispatch({
            type: 'required-change',
            payload: { fieldPath: effect.target, required: effect.payload.required },
          })
          break
        case 'set-value':
          this.dataStore.write(this.stepId, effect.target, effect.payload.value)
          setValueEffects.push(effect)
          this.dispatch({
            type: 'reset',
            payload: { fieldPath: effect.target, value: effect.payload.value },
          })
          break
        case 'set-options':
          this.renderState.options.set(effect.target, effect.payload.options)
          this.dispatch({
            type: 'options-change',
            payload: { fieldPath: effect.target, options: effect.payload.options },
          })
          break
        case 'set-error':
          this.renderState.error.set(effect.target, effect.payload.error)
          this.dispatch({
            type: 'error-update',
            payload: { fieldPath: effect.target, error: effect.payload.error },
          })
          break
        case 'set-disabled':
          this.renderState.disabled.set(effect.target, effect.payload.disabled)
          this.dispatch({
            type: 'disable-update',
            payload: { fieldPath: effect.target, disabled: effect.payload.disabled },
          })
          break
      }
    }
    return setValueEffects
  }

  /** 派发 SystemEvent 给订阅者 */
  private dispatch(event: SystemEvent): void {
    const set = this.subscribers.get(event.type)
    if (set) {
      for (const handler of set) {
        handler(event)
      }
    }
  }

  /** effect 序列规范化签名（循环检测用，仅 type+target，不含 payload 值） */
  private effectSignature(effects: Effect[]): string {
    return effects
      .map((e) => `${e.type}:${e.target}`)
      .sort()
      .join('|')
  }

  /** halt 上报（设计 §3.3 report 通道） */
  private reportHalt(reason: 'depth-exceeded' | 'cycle-detected', depth: number, effectSigs: string[]): void {
    const sig = effectSigs[effectSigs.length - 1] ?? ''
    this.renderState.__linkageHalt = { reason, atDepth: depth, sig }
    console.warn('[FormEngine] linkage halt', { reason, atDepth: depth, sig })
  }

  // ─── 可见性解析（含祖先传播，设计 §4.3）───

  /** 节点是否可见（自身 ∧ 所有祖先） */
  isNodeVisible(nodeId: string): boolean {
    const node = this.findNode(nodeId, this.layout)
    if (!node) return true // 未找到 → 默认可见
    // 检查自身 + 所有祖先
    for (const ancestor of this.getAncestors(nodeId, this.layout)) {
      const v = this.renderState.visibility.get(ancestor.id ?? '')
      if (v === false) return false
    }
    const selfV = this.renderState.visibility.get(nodeId)
    return selfV !== false
  }

  /** 字段是否可见（通过 field name 查找所在节点） */
  isFieldVisible(fieldName: string): boolean {
    const nodeId = this.findFieldNodeId(fieldName, this.layout)
    if (!nodeId) return true // 未找到 → 默认可见
    return this.isNodeVisible(nodeId)
  }

  private findNode(id: string, nodes: LayoutNode[]): LayoutNode | undefined {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) {
        const found = this.findNode(id, n.children)
        if (found) return found
      }
    }
    return undefined
  }

  private findFieldNodeId(fieldName: string, nodes: LayoutNode[]): string | undefined {
    for (const n of nodes) {
      if (n.kind === 'field' && n.ref === fieldName) return n.id ?? n.ref
      if (n.children) {
        const found = this.findFieldNodeId(fieldName, n.children)
        if (found) return found
      }
    }
    return undefined
  }

  private getAncestors(nodeId: string, nodes: LayoutNode[]): LayoutNode[] {
    const ancestors: LayoutNode[] = []
    const walk = (ns: LayoutNode[], parents: LayoutNode[]): boolean => {
      for (const n of ns) {
        if (n.id === nodeId) {
          ancestors.push(...parents)
          return true
        }
        if (n.children) {
          if (walk(n.children, [...parents, n])) return true
        }
      }
      return false
    }
    walk(nodes, [])
    return ancestors
  }
}

// ─── 校验函数（设计 §5.3 / §5.4，纯函数）───

/** validateFieldValue：required + pattern + min/max（设计 §5.3） */
export function validateFieldValue(
  field: FieldSchema,
  value: unknown,
  renderState: RenderState,
): ValidationResult {
  // label 类型永远不校验
  if (field.type === 'label') return { ok: true }

  // effectiveRequired：RenderState 覆盖原 required
  const effectiveRequired = renderState.required.get(field.name) ?? field.required

  // 必填校验
  if (effectiveRequired) {
    if (isEmptyValue(value, field.type)) {
      return { ok: false, error: `${field.label}为必填项` }
    }
  }

  // pattern 校验（非法正则降级为不校验）
  const pattern = field.validation?.pattern
  if (pattern && typeof value === 'string' && value) {
    try {
      if (!new RegExp(pattern).test(value)) {
        return { ok: false, error: `${field.label}格式不正确` }
      }
    } catch {
      // 非法正则 → 降级不校验
    }
  }

  // 长度校验
  if (typeof value === 'string' && value) {
    const minLen = field.validation?.min_length
    const maxLen = field.validation?.max_length
    if (minLen !== undefined && value.length < minLen) {
      return { ok: false, error: `${field.label}长度不能少于${minLen}位` }
    }
    if (maxLen !== undefined && value.length > maxLen) {
      return { ok: false, error: `${field.label}长度不能超过${maxLen}位` }
    }
  }

  return { ok: true }
}

/** 空值判断（区分类型） */
function isEmptyValue(value: unknown, type: FieldSchema['type']): boolean {
  if (type === 'checkbox') return Array.isArray(value) ? value.length === 0 : true
  if (value == null) return true
  if (value === '') return true
  return false
}

/** isStepFormComplete：所有可见非 label 字段校验通过（设计 §5.4） */
export function isStepFormComplete(
  step: RenderStep,
  dataStore: DataStore,
  renderState: RenderState,
  isFieldVisible: (fieldName: string) => boolean,
): boolean {
  for (const field of step.fields) {
    if (field.type === 'label') continue
    if (!isFieldVisible(field.name)) continue
    const value = dataStore.read(step.id, field.name)
    const result = validateFieldValue(field, value, renderState)
    if (!result.ok) return false
  }
  return true
}

/** extractSubmitValues：提取提交值（剔除隐藏 + label，设计 §5.2） */
export function extractSubmitValues(
  step: RenderStep,
  dataStore: DataStore,
  isFieldVisible: (fieldName: string) => boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const layout = step.layout ?? []

  // 顶层字段
  for (const field of step.fields) {
    if (field.type === 'label') continue
    // 跳过 repeatable 子字段
    if (isRepeatableSubField(field.name, layout)) continue
    if (!isFieldVisible(field.name)) continue
    result[field.name] = dataStore.read(step.id, field.name)
  }

  // repeatable 整表
  for (const node of walkLayout(layout)) {
    if (node.kind === 'repeatable' && node.name) {
      // 检查 repeatable 节点是否可见
      if (!isRepeatableVisible(node, layout, isFieldVisible)) continue
      result[node.name] = dataStore.read(step.id, node.name)
    }
  }

  return result
}

// ─── 内部工具 ───

function* walkLayout(nodes: LayoutNode[]): Generator<LayoutNode> {
  for (const n of nodes) {
    yield n
    if (n.children) yield* walkLayout(n.children)
  }
}

function isRepeatableSubField(fieldName: string, layout: LayoutNode[]): boolean {
  for (const node of walkLayout(layout)) {
    if (node.kind === 'repeatable' && node.children) {
      for (const child of node.children) {
        if (child.kind === 'field' && child.ref === fieldName) return true
      }
    }
  }
  return false
}

function isRepeatableVisible(
  node: LayoutNode,
  layout: LayoutNode[],
  isFieldVisible: (fieldName: string) => boolean,
): boolean {
  // repeatable 节点的可见性通过其 id 判断
  // 这里简化：如果有 id，通过 isFieldVisible 检查（复用）
  // 实际 FormRenderer 会通过 isNodeVisible 检查
  if (node.id) {
    return isFieldVisible(node.id)
  }
  return true
}
