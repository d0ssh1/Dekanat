import 'server-only';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Хранилище файлов (вложения, готовые PDF). Интерфейс один, драйвер меняется настройкой:
 * в прототипе — папка на диске вне public/, для масштаба — S3-совместимое хранилище (docs/architecture.md §6).
 * Ключи — случайные UUID: имя файла пользователя в путь не попадает.
 */
export interface Storage {
  put(prefix: string, data: Uint8Array): Promise<string>;
  get(key: string): Promise<Buffer>;
}

class DiskStorage implements Storage {
  constructor(private root: string) {}
  private resolve(key: string) {
    if (!/^[a-z]+\/[0-9a-f-]{36}$/.test(key)) throw new Error('Недопустимый ключ хранилища');
    return path.join(this.root, key);
  }
  async put(prefix: string, data: Uint8Array) {
    if (!/^[a-z]+$/.test(prefix)) throw new Error('Недопустимый префикс');
    const key = `${prefix}/${randomUUID()}`;
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
    return key;
  }
  get(key: string) {
    return readFile(this.resolve(key));
  }
}

let instance: Storage | undefined;
export function storage(): Storage {
  if (!instance) {
    const driver = process.env.STORAGE_DRIVER ?? 'disk';
    if (driver !== 'disk') throw new Error(`Драйвер хранилища «${driver}» не подключён в прототипе`);
    instance = new DiskStorage(path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR ?? './storage'));
  }
  return instance;
}

/** Тип файла по первым байтам, а не по расширению (docs/security.md, T10). */
export function sniffType(buf: Uint8Array): 'application/pdf' | 'image/jpeg' | 'image/png' | null {
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  return null;
}

export const MAX_UPLOAD = 10 * 1024 * 1024;
