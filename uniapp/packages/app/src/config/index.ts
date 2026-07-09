// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 运行环境与 API 地址配置。
 *
 * 对齐 openapi.yaml servers：
 *   dev  -> http://localhost:8080          （本地后端）
 *   mock -> https://mock.declaro.example.com （业务联调 Mock）
 *   prod -> https://api.declaro.example.com  （生产）
 *
 * 取值优先级：VITE_API_BASE > VITE_API_MODE > 构建模式兜底。
 */

type ApiMode = 'dev' | 'mock' | 'prod'

const DEFAULT_BASE: Record<ApiMode, string> = {
  dev: 'http://localhost:8080',
  mock: 'https://mock.declaro.example.com',
  prod: 'https://api.declaro.example.com',
}

/** 当前 Vite 模式：development（pnpm dev:*）/ production（pnpm build:*） */
export const mode: string = import.meta.env.MODE ?? 'development'

/** API 基址 */
export const apiBase: string =
  import.meta.env.VITE_API_BASE ||
  (mode === 'production'
    ? DEFAULT_BASE[import.meta.env.VITE_API_MODE ?? 'prod']
    : DEFAULT_BASE.dev)

/** 请求默认超时（毫秒） */
export const requestTimeout = 30000
