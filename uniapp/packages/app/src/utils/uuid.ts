// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 生成 RFC 4122 v4 UUID。
 *
 * 优先使用 Web Crypto（H5 等支持环境），退化为 Math.random
 * （微信小程序等无 crypto.getRandomValues 的环境）。
 * 用于 POST 请求的 Idempotency-Key（对齐 openapi.yaml IdempotencyKey）。
 */
export function uuidv4(): string {
  const bytes = new Uint8Array(16)
  const g = globalThis as {
    crypto?: { getRandomValues(arr: Uint8Array): Uint8Array }
  }
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  // version 4 / variant 10xx
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
}
