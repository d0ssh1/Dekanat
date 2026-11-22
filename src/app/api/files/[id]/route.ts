import { NextResponse, type NextRequest } from 'next/server';
import { getViewer } from '@/server/auth/guards';
import { getMyAttachment } from '@/server/dal/documents';
import { storage } from '@/server/storage';

export const dynamic = 'force-dynamic';

/** Вложение заявки — только владельцу или сотруднику; всегда скачиванием, без открытия в браузере. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return new NextResponse('Нужен вход', { status: 401 });
  const { id } = await params;
  const a = await getMyAttachment(viewer, id);
  if (!a) return new NextResponse('Не найдено', { status: 404 });
  const bytes = await storage().get(a.key);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': a.mime,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(a.filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
