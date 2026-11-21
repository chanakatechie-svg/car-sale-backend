import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, normalize, sep } from 'path';
import { StorageDriver } from './storage.driver';

/** Root folder for local uploads. main.ts serves it at /uploads/. */
export const LOCAL_UPLOAD_ROOT = join(process.cwd(), 'uploads');

/** Saves files to ./uploads on this server. Fine for development or a single server with a persistent disk. */
export class LocalStorageDriver implements StorageDriver {
  readonly publicBaseUrl: string;

  constructor(appPublicUrl: string) {
    this.publicBaseUrl = `${appPublicUrl.replace(/\/+$/, '')}/uploads`;
  }

  async put(key: string, body: Buffer): Promise<string> {
    const path = this.resolve(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return `${this.publicBaseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolve(key)).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }

  /** Keeps keys inside the uploads folder (no `../` escapes). */
  private resolve(key: string) {
    const path = normalize(join(LOCAL_UPLOAD_ROOT, key));
    if (!path.startsWith(LOCAL_UPLOAD_ROOT + sep)) throw new Error(`Invalid storage key: ${key}`);
    return path;
  }
}
