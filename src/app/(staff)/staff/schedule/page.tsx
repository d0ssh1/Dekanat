import Link from 'next/link';
import { requireStaff } from '@/server/auth/guards';
import { groupLessons, listGroups } from '@/server/services/staff';
import { dayOf, mondayOf } from '@/lib/time';
import { cn } from '@/lib/cn';
import { LessonEditor } from './LessonEditor';

export const metadata = { title: 'Расписание — сотрудник' };

/** Перенос пары и замена аудитории. Студенты группы узнают сразу — уведомлением и в расписании. */
export default async function StaffSchedule({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const viewer = await requireStaff();
  const groups = await listGroups(viewer);
  const sp = await searchParams;
  const group = groups.find((g) => g.id === sp.g) ?? groups.find((g) => g.short === 'ПИ-31') ?? groups[0]!;
  const today = dayOf(new Date());
  const from = mondayOf(today) < today ? today : mondayOf(today);
  const lessons = await groupLessons(viewer, group.id, from, 8);
  return (
    <>
      <h1 className="m-0 text-[36px] font-black tracking-[-0.03em]">Расписание группы</h1>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/staff/schedule?g=${g.id}`}
            className={cn(
              'flex h-11 items-center rounded-[13px] px-3.5 text-[14px] font-bold',
              g.id === group.id ? 'bg-ink-desk text-surface' : 'bg-surface',
            )}
          >
            {g.short}
          </Link>
        ))}
      </div>
      <LessonEditor lessons={lessons} />
    </>
  );
}
