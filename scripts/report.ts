/**
 * Собирает PDF-описание процесса: docs/report/report.html + снимки экранов → docs/report/deanery-process.pdf.
 * Запуск: npx tsx scripts/report.ts (после `npx playwright test tests/visual` со SCREENS=1).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const NAMES: Record<string, string> = {
  '01-vhod': 'Вход',
  '02-segodnya': 'Сегодня',
  '03-nasyshchennyj-den': 'Насыщенный день',
  '04-vyhodnoj': 'Выходной',
  '05-nedelya': 'Неделя',
  '06-ucheba': 'Учёба',
  '07-predmet': 'Предмет и калькулятор',
  '08-dokumenty': 'Документы',
  '09-nuzhno-dejstvie': 'Нужно действие',
  '10-novaya-zayavka': 'Новая заявка',
  '11-uvedomleniya': 'Уведомления',
  '12-profil': 'Профиль',
  '13-pomoshchnik': 'Помощник',
  '14-sotrudnik-ochered': 'Методист: очередь заявок',
  '15-sotrudnik-raspisanie': 'Методист: расписание',
  '16-novaya-zayavka-vybor': 'Выбор справки',
  '17-ne-najdeno': 'Не найдено',
};

const dir = path.resolve('docs/process/screens');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.png'))
  .sort();
const fig = (f: string) => {
  const key = f.replace(/-(telefon|pk)\.png$/, '');
  return `<figure><img src="../process/screens/${f}"><figcaption>${NAMES[key] ?? key}</figcaption></figure>`;
};
const html = readFileSync('docs/report/report.html', 'utf8') // картинки — относительные пути из docs/report/img
  .replace(
    '<!--PHONE-->',
    files
      .filter((f) => f.endsWith('-telefon.png'))
      .map(fig)
      .join('\n'),
  )
  .replace(
    '<!--DESK-->',
    files
      .filter((f) => f.endsWith('-pk.png'))
      .map(fig)
      .join('\n'),
  );
const built = path.resolve('docs/report/.report-built.html');
writeFileSync(built, html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(built).href, { waitUntil: 'networkidle' });
await page.pdf({
  path: 'docs/report/deanery-process.pdf',
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log('PDF: docs/report/deanery-process.pdf');
