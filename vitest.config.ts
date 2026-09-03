import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
      {
        find: '@auth',
        replacement: fileURLToPath(new URL('./auth.ts', import.meta.url)),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Run every test file in one long-lived worker thread. A child-process fork
    // can exceed Vitest's worker startup timeout while jsdom/MSW initialize,
    // whereas one thread avoids both that timeout and multi-worker CI churn.
    pool: 'threads',
    maxWorkers: 1,
    isolate: false,
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      // cobertura feeds the Azure DevOps coverage tab; json-summary drives the warn-only gate.
      reporter: ['text', 'html', 'cobertura', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.{ts,tsx}', 'src/db/**/*.{ts,tsx}', 'src/app/api/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.{ts,tsx}', 'src/generated/**', 'src/types/**'],
    },
  },
});
