import { notFound } from 'next/navigation';
import { DeskHomeDemo } from '../_demo';

/** Сверка с макетом B2Next «Главная ПК»: блок 1086×844. Только для разработки. */
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DeskHomeDemo className="h-[844px] w-[1086px]" />;
}
