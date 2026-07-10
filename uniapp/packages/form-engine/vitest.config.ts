// Copyright (c) 2026 Declaro. All rights reserved.

import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vue from '@vitejs/plugin-vue'

/**
 * Vitest 配置（独立于 app）。
 *
 * 设计要点：
 * - 加载 @vitejs/plugin-vue 处理 .vue SFC
 * - environment: node；组件测试按文件注入 happy-dom
 * - 覆盖率报告输出到系统临时目录（不污染源码树）
 * - 覆盖率门槛：行/函数 ≥80%，分支 ≥75%
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: join(tmpdir(), 'declaro-form-engine-coverage'),
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
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
