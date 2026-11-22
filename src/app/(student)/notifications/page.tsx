import { Soon } from '@/components/shell/Soon';

export const metadata = { title: 'Уведомления' };

export default function Page() {
  return (
    <Soon title="Уведомления" phase={7} about="Изменения в расписании, готовые справки и новости деканата." />
  );
}
