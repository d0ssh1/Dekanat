import { notFound } from 'next/navigation';
import { PhoneHomeDemo } from '../_demo';

/** Сверка с макетом B2PhoneA «Главная»: открывать во вьюпорте 390×844. Только для разработки. */
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PhoneHomeDemo className="h-dvh" />;
}
