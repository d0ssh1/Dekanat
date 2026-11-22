import { NextResponse, type NextRequest } from 'next/server';
import { getViewer } from '@/server/auth/guards';
import { getCertificatePdf } from '@/server/services/issue';

export const dynamic = 'force-dynamic';

/** PDF готовой справки — только владельцу (или сотруднику). Чужая — 404. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return new NextResponse('Нужен вход', { status: 401 });
  const { id } = await params;
  const pdf = await getCertificatePdf(viewer, id);
  if (!pdf) return new NextResponse('Не найдено', { status: 404 });
  return new NextResponse(new Uint8Array(pdf.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdf.filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
