import { verifyDocument } from '@/server/dal/documents';
import { Disclaimer, Wordmark } from '@/components/ui/primitives';
import { IconTile } from '@/components/ui/primitives';
import { dayMonth, dayOf } from '@/lib/time';

export const metadata = { title: 'Проверка справки' };

/**
 * Публичная проверка справки по QR. Без входа. Показывает минимум — номер, тип, даты, инициалы —
 * и ничего из профиля (функция БД app.verify_document).
 */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const doc = await verifyDocument(code);
  return (
    <main className="grid min-h-dvh place-items-center bg-desk-bg px-4 py-10">
      <div className="w-full max-w-[440px]">
        <Wordmark variant="desk" />
        <section className="mt-5 rounded-[28px] bg-surface p-6">
          {doc ? (
            <>
              <IconTile icon="check" tone="ok" size={40} />
              <h1 className="m-0 mt-4 text-[28px] leading-tight font-black tracking-[-0.02em]">
                Справка действительна
              </h1>
              <dl className="m-0 mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
                <dt className="text-ink-2">Документ</dt>
                <dd className="m-0 font-bold">
                  {doc.title} №{doc.number}
                </dd>
                <dt className="text-ink-2">Выдана</dt>
                <dd className="m-0 font-bold">{dayMonth(dayOf(doc.issued_at))}</dd>
                <dt className="text-ink-2">Кому</dt>
                <dd className="m-0 font-bold">{doc.holder}</dd>
                {doc.valid_until && (
                  <>
                    <dt className="text-ink-2">Действует до</dt>
                    <dd className="m-0 font-bold">{dayMonth(doc.valid_until)}</dd>
                  </>
                )}
              </dl>
            </>
          ) : (
            <>
              <IconTile icon="alert" tone="danger" size={40} />
              <h1 className="m-0 mt-4 text-[28px] leading-tight font-black tracking-[-0.02em]">
                Справка не найдена
              </h1>
              <p className="m-0 mt-2 text-[15px] text-ink-2">
                Проверьте ссылку из QR-кода. Если справку выдавали недавно — попробуйте позже.
              </p>
            </>
          )}
        </section>
        <Disclaimer className="mt-5" />
      </div>
    </main>
  );
}
