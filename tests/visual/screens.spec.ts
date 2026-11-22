import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { anchorMonday } from '../../seed/calendar';
import { addDays } from '../../src/lib/time';
import { login } from '../e2e/helpers';

/**
 * Снимки всех ключевых экранов на телефоне (390×844) и компьютере (1280×860) — для сверки с макетами
 * и для PDF-описания. Запуск: npx playwright test tests/visual --project=desktop
 */
const OUT = 'docs/process/screens';
const A = anchorMonday();
const at = (day: string, t: string) => `now=${encodeURIComponent(`${day}T${t}:00+10:00`)}`;
const MON = at(A, '10:00');

const SCREENS: { name: string; path: string; who?: 'student1' | 'staff' }[] = [
  { name: '01-vhod', path: '/login' },
  { name: '02-segodnya', path: `/?${MON}` },
  { name: '03-nasyshchennyj-den', path: `/?${at(addDays(A, 3), '11:44')}` },
  { name: '04-vyhodnoj', path: `/?${at(addDays(A, -1), '12:00')}` },
  { name: '05-nedelya', path: `/week?${MON}` },
  { name: '06-ucheba', path: `/study?${MON}` },
  { name: '08-dokumenty', path: `/documents?${MON}` },
  {
    name: '10-novaya-zayavka',
    path: '/documents/new?type=military&q=' + encodeURIComponent('нужна справка в военкомат'),
  },
  { name: '11-uvedomleniya', path: '/notifications' },
  { name: '12-profil', path: '/profile' },
  { name: '13-pomoshchnik', path: '/assistant?q=' + encodeURIComponent('Нужна справка в военкомат') },
  { name: '14-sotrudnik-ochered', path: '/staff', who: 'staff' },
  { name: '15-sotrudnik-raspisanie', path: '/staff/schedule', who: 'staff' },
  { name: '16-novaya-zayavka-vybor', path: '/documents/new' },
  { name: '17-ne-najdeno', path: '/no-such-page' },
];

async function shot(page: Page, name: string, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(1600);
  const tag = w < 800 ? 'telefon' : 'pk';
  await page.screenshot({ path: `${OUT}/${name}-${tag}.png` });
  // Таб-бар «прилипает» к низу окна — на снимке страницы целиком он закрывал бы середину.
  await page.addStyleTag({ content: 'nav[aria-label="Разделы"]{position:static!important}' });
  // Страница целиком — для дизайн-ревью (пустоты внизу, длинные списки).
  await page.screenshot({ path: `tests/visual/output/${name}-${tag}-full.png`, fullPage: true });
}

test.describe.configure({ mode: 'serial' });
test.beforeAll(() => {
  execSync('npm run db:seed', { stdio: 'ignore' });
  mkdirSync(OUT, { recursive: true });
  mkdirSync('tests/visual/output', { recursive: true });
});

test('снимки экранов', async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ reducedMotion: 'reduce', deviceScaleFactor: 2 });
  const student = await ctx.newPage();
  const staffCtx = await browser.newContext({ deviceScaleFactor: 2 });
  const staff = await staffCtx.newPage();

  await student.goto('/login');
  for (const [w, h] of [
    [390, 844],
    [1280, 860],
  ] as const)
    await shot(student, '01-vhod', w, h);
  await login(student, 'student1');
  await login(staff, 'staff');

  for (const s of SCREENS.slice(1)) {
    const page = s.who === 'staff' ? staff : student;
    await page.goto(s.path);
    for (const [w, h] of [
      [390, 844],
      [1280, 860],
    ] as const) {
      if (s.who === 'staff' && w < 800) continue;
      await shot(page, s.name, w, h);
    }
  }

  // Предмет с калькулятором и заявка «нужно действие» — по ссылкам со страниц.
  await student.goto(`/study?${MON}`);
  const ml = await student
    .locator('a[href^="/study/"]')
    .filter({ hasText: 'Машинное' })
    .first()
    .getAttribute('href');
  await student.goto(`${ml}?${MON}`);
  for (const [w, h] of [
    [390, 844],
    [1280, 860],
  ] as const)
    await shot(student, '07-predmet', w, h);
  await student.goto('/documents');
  const aid = await student
    .locator('a[href^="/documents/"]')
    .filter({ hasText: 'Материальная' })
    .first()
    .getAttribute('href');
  await student.goto(aid!);
  for (const [w, h] of [
    [390, 844],
    [1280, 860],
  ] as const)
    await shot(student, '09-nuzhno-dejstvie', w, h);

  await ctx.close();
  await staffCtx.close();
});
