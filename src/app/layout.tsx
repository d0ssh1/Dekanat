import type { Metadata, Viewport } from 'next';
import { UNIVERSITY } from '@/lib/university';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { ToastProvider } from '@/components/motion/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'деканат*', template: '%s · деканат*' },
  description: UNIVERSITY.disclaimer,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#ff6a3d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link
          rel="preload"
          href="/fonts/inter-tight-cyrillic-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <MotionProvider>
          <ToastProvider>{children}</ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
