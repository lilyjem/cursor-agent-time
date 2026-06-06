import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.{ts,js}'],
    environment: 'node',
    // 开启全局 API，避免在 CommonJS 的 .js 测试里 require('vitest')（vitest 是 ESM，会报错）
    globals: true,
  },
});
