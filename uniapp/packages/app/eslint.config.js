// Copyright (c) 2026 Declaro. All rights reserved.

/**
 * ESLint flat config（ESLint 9 标准）。
 *
 * C7/C8 强制机制：组件严禁直接调用引擎 API / 访问 Store 内部 / import 内核模块。
 * 通过 no-restricted-imports 按文件粒度拦截，不依赖人审。
 *
 * 详见 TDD「规范门禁基建」节、设计 §6 C7/C8 落地机制。
 */
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    // 全局规则：_ 前缀标识「故意未使用」，允许通过（标准约定）
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // C7/C8 隔离规则已随引擎迁移至 @declaro/form-engine 包
    // app 内不再持有 fields/layouts 组件，故移除本规则块
    // 忽略生成产物与依赖
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
)
