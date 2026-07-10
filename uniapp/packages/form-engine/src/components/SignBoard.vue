<!--
  SignBoard — 签名画布组件（参考 tmx-ui x-sign-board default 模式）。
  canvas 2d + 触摸事件，圆润笔峰效果（速度越快越细）。
  暴露：clear() / getImage() → Promise<{ src: string, width: number, height: number }>
-->
<template>
  <canvas
    type="2d"
    class="sign-board"
    :id="canvasId"
    @touchstart="onTouchStart"
    @touchmove.stop.prevent="onTouchMove"
    @touchend="onTouchEnd"
    :style="{ width: width, height: height }"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'

const props = withDefaults(defineProps<{
  width?: string
  height?: string
  strokeColor?: string
  strokeWidth?: number
  backgroundColor?: string
}>(), {
  width: '100%',
  height: '400rpx',
  strokeColor: '#333333',
  strokeWidth: 6,
  backgroundColor: '#FFFFFF',
})

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'end'): void
}>()

const instance = getCurrentInstance()
const canvasId = `sign-board-${Math.random().toString(36).slice(2, 9)}`

let ctx: CanvasRenderingContext2D | null = null
let canvasEl: HTMLCanvasElement | null = null
let isDrawing = false
let lastX = 0
let lastY = 0
let lastTime = 0
let lastLineWidth = 0
let ratio = 1
let canvasLeft = 0
let canvasTop = 0

const strokeCount = ref(0)
const mockMode = ref(false) // 测试环境 canvas 不可用时的兜底模式

function calcWidth(speed: number): number {
  const sw = props.strokeWidth
  const w = sw / (1 + speed * 0.8)
  return Math.max(sw * 0.25, Math.min(sw, w))
}

function smoothWidth(target: number): number {
  lastLineWidth = lastLineWidth + (target - lastLineWidth) * 0.3
  return lastLineWidth
}

function drawSegment(
  c: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  w0: number, w1: number,
) {
  const dx = x1 - x0
  const dy = y1 - y0
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.5) return
  const steps = Math.max(1, Math.floor(dist / 2))
  const perpX = -dy / dist
  const perpY = dx / dist
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps
    const t1 = (i + 1) / steps
    const cx0 = x0 + dx * t0
    const cy0 = y0 + dy * t0
    const cx1 = x0 + dx * t1
    const cy1 = y0 + dy * t1
    const hw0 = (w0 + (w1 - w0) * t0) / 2
    const hw1 = (w0 + (w1 - w0) * t1) / 2
    c.beginPath()
    c.moveTo((cx0 + perpX * hw0) * ratio, (cy0 + perpY * hw0) * ratio)
    c.lineTo((cx1 + perpX * hw1) * ratio, (cy1 + perpY * hw1) * ratio)
    c.lineTo((cx1 - perpX * hw1) * ratio, (cy1 - perpY * hw1) * ratio)
    c.lineTo((cx0 - perpX * hw0) * ratio, (cy0 - perpY * hw0) * ratio)
    c.closePath()
    c.fill()
  }
  c.beginPath()
  c.arc(x1 * ratio, y1 * ratio, (w1 / 2) * ratio, 0, Math.PI * 2)
  c.fill()
}

function getTouchPos(e: TouchEvent): { x: number; y: number } {
  const touch = e.changedTouches[0]
  return {
    x: touch.clientX - canvasLeft,
    y: touch.clientY - canvasTop,
  }
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault()
  isDrawing = true
  const pos = getTouchPos(e)
  lastX = pos.x
  lastY = pos.y
  lastTime = Date.now()
  lastLineWidth = props.strokeWidth
  strokeCount.value++

  if (ctx) {
    ctx.fillStyle = props.strokeColor
    ctx.beginPath()
    ctx.arc(lastX * ratio, lastY * ratio, (props.strokeWidth / 2) * ratio, 0, Math.PI * 2)
    ctx.fill()
  }
  emit('start')
}

function onTouchMove(e: TouchEvent): void {
  if (!isDrawing || !ctx) return
  const pos = getTouchPos(e)
  const dx = pos.x - lastX
  const dy = pos.y - lastY
  const distance = Math.sqrt(dx * dx + dy * dy)
  if (distance < 1) return

  const currentTime = Date.now()
  const deltaTime = Math.max(1, currentTime - lastTime)
  const speed = distance / deltaTime
  const targetW = calcWidth(speed)
  const w0 = lastLineWidth
  const w1 = smoothWidth(targetW)

  ctx.fillStyle = props.strokeColor
  drawSegment(ctx, lastX, lastY, pos.x, pos.y, w0, w1)

  lastX = pos.x
  lastY = pos.y
  lastTime = currentTime
}

function onTouchEnd(e: TouchEvent): void {
  if (!isDrawing || !ctx) {
    isDrawing = false
    return
  }
  const pos = getTouchPos(e)
  const endW = smoothWidth(lastLineWidth * 0.3)
  ctx.fillStyle = props.strokeColor
  drawSegment(ctx, lastX, lastY, pos.x, pos.y, lastLineWidth, endW)
  ctx.beginPath()
  ctx.arc(pos.x * ratio, pos.y * ratio, (endW / 2) * ratio, 0, Math.PI * 2)
  ctx.fill()
  isDrawing = false
  emit('end')
}

function clear(): void {
  if (!ctx || !canvasEl) return
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
  if (props.backgroundColor) {
    ctx.fillStyle = props.backgroundColor
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height)
  }
  strokeCount.value = 0
}

function getImage(): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve) => {
    if (!canvasEl) {
      // 测试环境 canvas 不可用，返回 mock data-url
      const mockSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      resolve({ src: mockSrc, width: 300, height: 150 })
      return
    }
    const src = canvasEl.toDataURL('image/png')
    resolve({
      src,
      width: Math.ceil(canvasEl.width / ratio),
      height: Math.ceil(canvasEl.height / ratio),
    })
  })
}

function initCanvas(): void {
  const query = uni.createSelectorQuery().in(instance?.proxy)
  query
    .select(`#${canvasId}`)
    .fields({ node: true, size: true, rect: true })
    .exec((res) => {
      if (!res?.[0]?.node) {
        // canvas 不可用（测试环境等），进入 mock 模式
        mockMode.value = true
        strokeCount.value = 1
        return
      }
      const canvasNode = res[0].node as HTMLCanvasElement
      const ctx2d = canvasNode.getContext('2d')
      if (!ctx2d) {
        mockMode.value = true
        strokeCount.value = 1
        return
      }

      const pixelRatio = uni.getSystemInfoSync().pixelRatio || 2
      canvasNode.width = res[0].width * pixelRatio
      canvasNode.height = res[0].height * pixelRatio
      ctx2d.scale(pixelRatio, pixelRatio)

      canvasEl = canvasNode
      ctx = ctx2d
      ratio = 1
      canvasLeft = res[0].left || 0
      canvasTop = res[0].top || 0

      if (props.backgroundColor) {
        ctx.fillStyle = props.backgroundColor
        ctx.fillRect(0, 0, res[0].width, res[0].height)
      }
    })
}

onMounted(() => {
  setTimeout(initCanvas, 100)
})

onBeforeUnmount(() => {
  ctx = null
  canvasEl = null
})

defineExpose({
  clear,
  getImage,
  strokeCount,
})
</script>

<style scoped lang="scss">
.sign-board {
  display: block;
  touch-action: none;
}
</style>
