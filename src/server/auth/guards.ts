import 'server-only';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { DbContext } from '@/server/db';
import { getSessionUser, SESSION_COOKIE } from './session';

/**
 * Viewer — «кто смотрит». Единственный источник id владельца для DAL.
 * Его нельзя получить из URL, формы или ответа ИИ — только из сессии.
 */
export type StudentViewer = { role: 'student'; userId: string };
export type StaffViewer = { role: 'staff'; userId: string };
export type Viewer = StudentViewer | StaffViewer;

export function ctxOf(v: Viewer): DbContext {
  return { role: v.role, userId: v.userId };
}

export async function getViewer(): Promise<Viewer | null> {
  const u = await getSessionUser();
  return u ? { role: u.role, userId: u.id } : null;
}

/** Нет сессии → на вход. Была cookie, но сессия истекла → экран «Сессия истекла» с возвратом туда же. */
export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (v) return v;
  const hadCookie = (await cookies()).has(SESSION_COOKIE);
  const path = (await headers()).get('x-path') ?? '/';
  const params = new URLSearchParams();
  if (hadCookie) params.set('expired', '1');
  if (path !== '/' && path.startsWith('/') && !path.startsWith('//')) params.set('next', path);
  const q = params.toString();
  redirect(q ? `/login?${q}` : '/login');
}

/** Только студент. Сотруднику студенческие страницы «не существуют». */
export async function requireStudent(): Promise<StudentViewer> {
  const v = await requireViewer();
  if (v.role !== 'student') notFound();
  return v;
}

/** Только сотрудник. Студенту страницы сотрудника «не существуют» — 404, а не 403. */
export async function requireStaff(): Promise<StaffViewer> {
  const v = await requireViewer();
  if (v.role !== 'staff') notFound();
  return v;
}
