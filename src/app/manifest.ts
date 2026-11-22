import type { MetadataRoute } from 'next';

/** Установка на телефон как приложение (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'деканат* — концепт кабинета студента',
    short_name: 'деканат',
    description: 'Концепт для конкурса «Цифровой деканат будущего». Не официальный сервис вуза.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ff6a3d',
    theme_color: '#ff6a3d',
    lang: 'ru',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
