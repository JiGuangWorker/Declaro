import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/api-types-import.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'packages/app/src/store/modules/auth.ts',
        'packages/app/src/api/request.ts',
        'packages/app/src/api/auth.ts',
        'packages/app/src/utils/storage.ts',
      ],
      reporter: ['text'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'packages/app/src'),
    },
  },
})
