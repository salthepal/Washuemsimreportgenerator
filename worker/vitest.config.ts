import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    // Tests exercise pure TypeScript logic; no Cloudflare Workers runtime needed.
    globals: false,
  },
  esbuild: {
    // Use the test-specific tsconfig so Workers types don't bleed into test files.
    tsconfigRaw: { compilerOptions: { target: 'ESNext', module: 'ESNext', strict: true } },
  },
});
