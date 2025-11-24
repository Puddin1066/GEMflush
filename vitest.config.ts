import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.tdd.test.{ts,tsx}'],
    exclude: [
      '**/*.spec.{ts,tsx}',
      '**/node_modules/**',
      '**/.next/**',
      '**/_archive/**',
      '**/tests/e2e/_archive/**',
      '**/*.example.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'scripts/',
        '*.config.{ts,js}',
        'lib/db/migrations/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

