// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * ESLint flat config（ESLint 9 标准）。
 *
 * C7/C8 强制机制：组件严禁直接调用引擎 API / 访问 Store 内部 / import 内核模块。
 * 通过 no-restricted-imports 按文件粒度拦截，不依赖人审。
 */
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // C7/C8 强制：fields/ 与 layouts/ 禁止 import 内核模块
    files: ['src/fields/**', 'src/layouts/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../signal-router',
                '../data-store',
                '../component-registry',
                '../types/engine',
                '../types/engine-runtime',
                '../linkage/*',
              ],
              message:
                '组件严禁 import 内核模块（C7/C8）。只允许消费三相插槽：类型 import 自 ../types/slots，能力通过 ../slots/* composable 注入。',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
)
