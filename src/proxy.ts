import { NextResponse, type NextRequest } from 'next/server';

/**
 * Прокси (бывший middleware) делает две вещи:
 * 1. Ставит Content-Security-Policy с одноразовым nonce: чужие скрипты на странице не выполнятся.
 * 2. Оптимистично отправляет на вход, если cookie сессии нет вовсе.
 *
 * Это НЕ граница безопасности: настоящая проверка сессии и владельца — в DAL (docs/security.md, T2/T3).
 */
const PUBLIC = ['/login', '/verify', '/api/health'];
const SESSION_COOKIES = ['__Host-session', 'dekanat-session'];

function csp(nonce: string) {
  const dev = process.env.NODE_ENV !== 'production';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // Motion и Next ставят inline-стили в атрибуты style — без этого анимации не работают.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join('; ');
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic =
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    (process.env.NODE_ENV !== 'production' && pathname.startsWith('/dev'));
  const hasCookie = SESSION_COOKIES.some((c) => req.cookies.has(c));

  if (!isPublic && !hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const headers = new Headers(req.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', policy);
  headers.set('x-path', pathname + search);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set('content-security-policy', policy);
  return res;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|fonts/|favicon.ico|icon|apple-icon|manifest.webmanifest).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
};
