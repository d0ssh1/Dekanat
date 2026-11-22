import type { Options } from '@node-rs/argon2';

/**
 * Параметры argon2id по рекомендации OWASP (Password Storage Cheat Sheet):
 * 19 МиБ памяти, 2 прохода, 1 поток.
 */
export const ARGON2_OPTIONS: Options = {
  algorithm: 2, // Algorithm.Argon2id (const enum нельзя импортировать при isolatedModules)
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
