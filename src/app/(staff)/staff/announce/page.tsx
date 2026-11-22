import { requireStaff } from '@/server/auth/guards';
import { listGroups } from '@/server/services/staff';
import { AnnounceForm } from './AnnounceForm';

export const metadata = { title: 'Объявления — сотрудник' };

export default async function AnnouncePage() {
  const viewer = await requireStaff();
  const groups = await listGroups(viewer);
  return (
    <>
      <h1 className="m-0 text-[36px] font-black tracking-[-0.03em]">Объявление</h1>
      <p className="m-0 mt-1 text-[15px] text-ink-2">
        Придёт студентам выбранных групп в колокольчик и всплывёт подсказкой, если кабинет открыт.
      </p>
      <AnnounceForm groups={groups} />
    </>
  );
}
