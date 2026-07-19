import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'PostgreSQL Migration Tests',
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000, // 30 seconds per test
    hookTimeout: 30000, // 30 seconds for setup/teardown
    pool: 'forks', // Use forks for better isolation
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts', 'drizzle/**/*.ts'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integrity/**/*.test.ts',
      'tests/security/**/*.test.ts',
      'tests/load/**/*.test.ts',
      'tests/regression/**/*.test.ts',
    ],
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@server': path.resolve(__dirname, './server'),
      '@drizzle': path.resolve(__dirname, './drizzle'),
    },
  },
});
