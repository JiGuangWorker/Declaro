// Copyright (c) 2026 Declaro. All rights reserved.

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string
  /** 覆盖 API 基址（联调 Mock / 指定环境） */
  readonly VITE_API_BASE?: string
  /** 生产构建下选择 API 环境：dev | mock | prod */
  readonly VITE_API_MODE?: 'dev' | 'mock' | 'prod'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
