import 'server-only';
import { hash, verify } from '@node-rs/argon2';
import { ARGON2_OPTIONS } from './password-params';

export function hashPassword(plain: string) {
  return hash(plain, ARGON2_OPTIONS);
}

// Хеш «ни от чего»: проверяем его, когда логина нет, чтобы время ответа не выдавало,
// существует ли пользователь.
let dummy: Promise<string> | undefined;
function dummyHash() {
  dummy ??= hash('dummy-password-for-timing', ARGON2_OPTIONS);
  return dummy;
}

export async function verifyPassword(storedHash: string | null, plain: string): Promise<boolean> {
  if (!storedHash) {
    await verify(await dummyHash(), plain).catch(() => false);
    return false;
  }
  return verify(storedHash, plain).catch(() => false);
}
