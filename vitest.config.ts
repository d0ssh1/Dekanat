import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'node:path';
import { switchToTestDb } from './tests/support/test-db';

config();
// Тесты пересоздают данные — только в своей базе, не в базе разработки.
switchToTestDb();

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // 'server-only' запрещает импорт в клиент; в тестах Node это обычный серверный код.
      'server-only': path.resolve(import.meta.dirname, 'tests/support/empty.ts'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/security/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    // Тесты безопасности ходят в настоящую БД ролью app_user
    fileParallelism: false,
    globalSetup: './tests/support/global-setup.ts',
  },
});
