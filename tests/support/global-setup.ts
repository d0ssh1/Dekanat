import { prepareTestDb, switchToTestDb } from './test-db';

/** Перед прогоном: своя база для тестов (см. test-db.ts). */
export default async function globalSetup() {
  if (switchToTestDb()) await prepareTestDb();
}
