// Copyright (c) 2026 Declaro. All rights reserved.

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vue from '@vitejs/plugin-vue'

/**
 * Vitest 配置（独立于 vite.config.ts）。
 *
 * 设计要点（对齐 Issue #9 TDD 已验证方案）：
 * - 不加载 @dcloudio/vite-plugin-uni，绕开 uni 编译插件，直接跑纯 TS 单测
 * - 加载 @vitejs/plugin-vue 处理 .vue SFC（组件测试需要，Issue #9 Phase 2+）
 * - environment: node —— 纯 TS 测试默认环境；组件测试按文件注入 happy-dom
 * - 通过 setup.ts stub globalThis.uni，覆盖 storage/request/toast/chooseImage 等 API
 * - 覆盖率报告输出到系统临时目录（$TMPDIR/declaro-coverage），不污染源码树
 * - 覆盖率门槛：行/函数 ≥80%，分支 ≥75%（对齐 Git规范.md §3.1 PR 前置条件）
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: join(tmpdir(), 'declaro-coverage'),
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.ts',
        'src/env.d.ts',
        'src/**/index.ts',
        'src/__tests__/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@api-types': fileURLToPath(
        new URL('../../../shared/api-types', import.meta.url),
      ),
    },
  },
})
