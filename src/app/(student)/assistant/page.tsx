import { Soon } from '@/components/shell/Soon';

export const metadata = { title: 'Помощник' };

export default function Page() {
  return (
    <Soon
      title="Помощник"
      phase={8}
      about="Опишите, что нужно, — помощник соберёт заявку и ответит по вашим данным."
    />
  );
}
