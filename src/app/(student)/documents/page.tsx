import { Soon } from '@/components/shell/Soon';

export const metadata = { title: 'Документы' };

export default function Page() {
  return (
    <Soon
      title="Документы"
      phase={6}
      about="Справки и заявления онлайн: заказ за минуту, статус и срок простыми словами."
    />
  );
}
