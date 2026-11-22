import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** Границы слоёв: к БД ходят только DAL и сервисы (см. docs/architecture.md, §3 и §5.2). */
const dbBoundary = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: [
    'src/server/dal/**',
    'src/server/services/**',
    'src/server/db/**',
    'src/server/auth/**',
    'src/server/events/**',
    'src/server/proactive/**',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/server/db', '@/server/db/*'],
            message: 'Доступ к БД — только через src/server/dal (проверка владельца + RLS).',
          },
          {
            group: ['drizzle-orm', 'drizzle-orm/*', 'postgres'],
            message: 'SQL пишется только в слое DAL/сервисов.',
          },
        ],
      },
    ],
  },
};

const config = [
  ...nextVitals,
  ...nextTs,
  dbBoundary,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'design/**',
      'drizzle/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
];

export default config;
