import { Soon } from '@/components/shell/Soon';

export const metadata = { title: 'Учёба' };

export default function Page() {
  return (
    <Soon
      title="Учёба"
      phase={5}
      about="Баллы по предметам, допуск к сессии и калькулятор: сколько нужно на экзамене."
    />
  );
}
