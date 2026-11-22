import { NextResponse } from 'next/server';
import { databaseIsUp } from '@/server/dal/health';

export const dynamic = 'force-dynamic';

/** Проверка живости для Docker и мониторинга: приложение отвечает и БД доступна. */
export async function GET() {
  const ok = await databaseIsUp();
  return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
}
