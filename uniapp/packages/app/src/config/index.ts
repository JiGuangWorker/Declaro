// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * 运行环境与 API 地址配置。
 *
 * 对齐 openapi.yaml servers：
 *   dev  -> http://localhost:8080                              （本地后端）
 *   mock -> https://m1.apifoxmock.com/m1/8554967-8330741-default （Apifox Mock 联调）
 *   prod -> 待定（后端就绪后替换，当前也指向 Mock）
 *
 * 取值优先级：VITE_API_BASE > VITE_API_MODE > 构建模式兜底。
 */

type ApiMode = 'dev' | 'mock' | 'prod'

const DEFAULT_BASE: Record<ApiMode, string> = {
  dev: 'http://localhost:8080',
  mock: 'https://m1.apifoxmock.com/m1/8554967-8330741-default',
  prod: 'https://m1.apifoxmock.com/m1/8554967-8330741-default',
}

/** 当前 Vite 模式：development（pnpm dev:*）/ production（pnpm build:*） */
export const mode: string = import.meta.env.MODE ?? 'development'

/** API 基址：VITE_API_BASE > VITE_API_MODE > 构建模式兜底（dev→dev, prod→prod） */
const fallbackMode: ApiMode = mode === 'production' ? 'prod' : 'dev'
export const apiBase: string =
  import.meta.env.VITE_API_BASE ||
  DEFAULT_BASE[import.meta.env.VITE_API_MODE ?? fallbackMode]

/** 请求默认超时（毫秒） */
export const requestTimeout = 30000
