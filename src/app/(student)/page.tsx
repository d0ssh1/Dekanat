import { Soon } from '@/components/shell/Soon';

export const metadata = { title: 'Сегодня' };

export default function Page() {
  return (
    <Soon
      title="Сегодня"
      phase={4}
      about="Отсчёт до следующей пары, расписание дня с изменениями и «По делам»."
    />
  );
}
