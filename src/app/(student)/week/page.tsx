import { Soon } from '@/components/shell/Soon';

export const metadata = { title: 'Неделя' };

export default function Page() {
  return (
    <Soon
      title="Неделя"
      phase={4}
      about="Все пары недели с аудиториями, преподавателями, переносами и заменами."
    />
  );
}
