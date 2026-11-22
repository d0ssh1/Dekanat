import { NextResponse, type NextRequest } from 'next/server';
import { getViewer } from '@/server/auth/guards';
import { attachFile, UserError } from '@/server/services/requests';
import { MAX_UPLOAD } from '@/server/storage';

export const dynamic = 'force-dynamic';

/**
 * Загрузка файла в заявку (multipart). Route Handler вместо Server Action — из-за размера файла.
 * Защита от CSRF: cookie SameSite=Lax + обязательная проверка Origin.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get('origin');
  if (!origin || new URL(origin).host !== req.headers.get('host')) {
    return NextResponse.json({ error: 'Запрос не с нашего сайта' }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer || viewer.role !== 'student')
    return NextResponse.json({ error: 'Нужен вход' }, { status: 401 });
  if (Number(req.headers.get('content-length') ?? 0) > MAX_UPLOAD + 64 * 1024) {
    return NextResponse.json({ error: 'Файл больше 10 МБ' }, { status: 413 });
  }
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const requirementId = form?.get('requirementId');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Выберите файл' }, { status: 400 });
  try {
    const res = await attachFile(
      viewer,
      id,
      typeof requirementId === 'string' && /^[0-9a-f-]{36}$/i.test(requirementId) ? requirementId : null,
      {
        name: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
    );
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
