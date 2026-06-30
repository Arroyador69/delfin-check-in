import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // Smoke tests críticos para MIR (sin depender de DB ni de endpoints reales)
    include: ['tests/mir-*.test.ts', 'tests/ministerio-*.test.ts', 'tests/superadmin-*.test.ts', 'tests/polar-*.test.ts', 'tests/tenant-*.test.ts'],
    exclude: ['tests/tenant-isolation.test.ts'],
    testTimeout: 60_000,
  },
});

