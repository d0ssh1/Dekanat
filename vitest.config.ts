import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'node:path';

config();

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/security/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    // Тесты безопасности ходят в настоящую БД ролью app_user
    fileParallelism: false,
  },
});
