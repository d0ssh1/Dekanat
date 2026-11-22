import { NextResponse, type NextRequest } from 'next/server';
import { getViewer } from '@/server/auth/guards';
import { getWeek } from '@/server/dal/schedule';
import { addDays, dayOf, isValidDay, mondayOf } from '@/lib/time';

export const dynamic = 'force-dynamic';

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

/**
 * «В календарь телефона»: неделя расписания в формате iCalendar (.ics).
 * Только свои пары: группа берётся из сессии, параметр — лишь номер недели.
 */
export async function GET(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== 'student') return new NextResponse('Нужен вход', { status: 401 });
  const w = req.nextUrl.searchParams.get('w');
  const monday = mondayOf(isValidDay(w) ? w : dayOf(new Date()));
  const lessons = (await getWeek(viewer, monday)).filter((l) => l.status === 'scheduled');
  const now = stamp(new Date().toISOString());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dekanat concept//RU',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(`Пары ${monday} — ${addDays(monday, 5)}`)}`,
    ...lessons.flatMap((l) => [
      'BEGIN:VEVENT',
      `UID:${l.id}@dekanat.concept`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(l.startsAt)}`,
      `DTEND:${stamp(l.endsAt)}`,
      `SUMMARY:${esc(`${l.subject} (${l.kindLabel})`)}`,
      `LOCATION:${esc(l.online ? 'онлайн' : `ауд. ${l.room}`)}`,
      `DESCRIPTION:${esc(`${l.teacher}${l.changeNote ? ` · ${l.changeNote}` : ''}`)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="week-${monday}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
