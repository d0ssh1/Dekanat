import { notFound } from 'next/navigation';
import { KitGallery } from './_gallery';

export const metadata = { title: 'Кит компонентов' };

/** Витрина дизайн-системы и анимаций. Только для разработки. */
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <KitGallery />;
}
