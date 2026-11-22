import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';

/**
 * Справка в PDF. Шрифт Inter Tight (OFL) в двух наборах символов — кириллица и латиница:
 * PDF-библиотека не умеет вариативные шрифты, поэтому текст режется на куски по алфавиту.
 * На каждой странице — водяной знак «концепт»: документ не выдаётся за настоящий.
 */
type Fonts = { cyr: PDFFont; lat: PDFFont; cyrB: PDFFont; latB: PDFFont };
const FONT_DIR = path.join(process.cwd(), 'src/server/pdf/fonts');

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  const f = (n: string) =>
    readFile(path.join(FONT_DIR, `inter-tight-${n}-normal.woff`)).then((b) =>
      doc.embedFont(b, { subset: true }),
    );
  const [cyr, lat, cyrB, latB] = await Promise.all([
    f('cyrillic-400'),
    f('latin-400'),
    f('cyrillic-800'),
    f('latin-800'),
  ]);
  return { cyr: cyr!, lat: lat!, cyrB: cyrB!, latB: latB! };
}

const isCyr = (ch: string) => /[Ѐ-ӿ№]/.test(ch);

function runs(text: string) {
  const out: { t: string; cyr: boolean }[] = [];
  for (const ch of text) {
    const c = isCyr(ch);
    const last = out.at(-1);
    if (last && (last.cyr === c || ch === ' ')) last.t += ch;
    else out.push({ t: ch, cyr: c });
  }
  return out;
}

function width(fonts: Fonts, text: string, size: number, bold = false) {
  return runs(text).reduce(
    (w, r) =>
      w +
      (r.cyr ? (bold ? fonts.cyrB : fonts.cyr) : bold ? fonts.latB : fonts.lat).widthOfTextAtSize(r.t, size),
    0,
  );
}

function draw(
  page: PDFPage,
  fonts: Fonts,
  text: string,
  x: number,
  y: number,
  size: number,
  opts: { bold?: boolean; color?: [number, number, number] } = {},
) {
  let cx = x;
  for (const r of runs(text)) {
    const font = r.cyr ? (opts.bold ? fonts.cyrB : fonts.cyr) : opts.bold ? fonts.latB : fonts.lat;
    page.drawText(r.t, { x: cx, y, size, font, color: rgb(...(opts.color ?? [0.08, 0.08, 0.1])) });
    cx += font.widthOfTextAtSize(r.t, size);
  }
}

function wrap(fonts: Fonts, text: string, size: number, maxW: number) {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (width(fonts, next, size) > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export type CertificateData = {
  title: string;
  number: number;
  issuedOn: string;
  fullName: string;
  institute: string;
  direction: string;
  course: number;
  group: string;
  studyForm: string;
  funding: string;
  destination: string;
  verifyUrl: string;
  signer: string;
};

export async function renderCertificate(d: CertificateData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${d.title} №${d.number}`);
  doc.setProducer('деканат* — концепт для конкурса');
  const fonts = await loadFonts(doc);
  const page = doc.addPage([595.28, 841.89]); // A4
  const W = page.getWidth();
  const M = 56;
  const orange: [number, number, number] = [1, 0.416, 0.239];

  // Водяной знак — первым, под текстом: документ не выдаётся за настоящий.
  for (const [i, line] of ['КОНЦЕПТ', 'НЕ ОФИЦИАЛЬНЫЙ ДОКУМЕНТ'].entries()) {
    const size = i === 0 ? 64 : 28;
    draw(page, fonts, line, (W - width(fonts, line, size, true)) / 2, 300 - i * 44, size, {
      bold: true,
      color: [0.95, 0.93, 0.91],
    });
  }

  // Шапка
  page.drawRectangle({ x: 0, y: 841.89 - 120, width: W, height: 120, color: rgb(...orange) });
  draw(page, fonts, 'деканат*', M, 841.89 - 52, 20, { bold: true });
  draw(page, fonts, 'Концепт личного кабинета · конкурс «Цифровой деканат будущего»', M, 841.89 - 74, 10);
  draw(page, fonts, `№ ${d.number} от ${d.issuedOn}`, M, 841.89 - 98, 11, { bold: true });

  // Заголовок
  let y = 841.89 - 190;
  draw(page, fonts, d.title.toUpperCase(), M, y, 22, { bold: true });
  y -= 40;

  const para = (label: string, value: string) => {
    draw(page, fonts, label, M, y, 10, { color: [0.29, 0.29, 0.34] });
    y -= 16;
    for (const line of wrap(fonts, value, 13, W - M * 2 - 140)) {
      draw(page, fonts, line, M, y, 13, { bold: true });
      y -= 18;
    }
    y -= 8;
  };
  para('Выдана', d.fullName);
  para('Обучается', `${d.institute}, ${d.course} курс, группа ${d.group}`);
  para('Направление подготовки', d.direction);
  para('Форма обучения', `${d.studyForm}, ${d.funding}`);
  para('Справка выдана для предоставления', d.destination);

  y -= 10;
  for (const line of wrap(
    fonts,
    'Справка действительна при проверке QR-кода: ссылка покажет номер, дату и инициалы владельца.',
    11,
    W - M * 2 - 140,
  )) {
    draw(page, fonts, line, M, y, 11, { color: [0.29, 0.29, 0.34] });
    y -= 15;
  }

  // QR проверки
  const qrPng = await QRCode.toBuffer(d.verifyUrl, {
    margin: 0,
    width: 240,
    color: { dark: '#14141a', light: '#ffffff' },
  });
  const qr = await doc.embedPng(qrPng);
  page.drawImage(qr, { x: W - M - 110, y: 841.89 - 400, width: 110, height: 110 });
  draw(page, fonts, 'Проверить', W - M - 110, 841.89 - 414, 9, { color: [0.29, 0.29, 0.34] });

  // Подпись
  y = 170;
  page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 1, color: rgb(0.8, 0.8, 0.84) });
  draw(page, fonts, d.signer, M, y - 16, 11);
  draw(page, fonts, 'подпись условная', M, y - 30, 9, { color: [0.54, 0.54, 0.59] });

  // Водяной знак и подвал
  draw(page, fonts, 'Не официальный сервис вуза. Все данные вымышлены.', M, 48, 9, {
    color: [0.54, 0.54, 0.59],
  });

  return doc.save();
}
