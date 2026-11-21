import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { STORAGE_DRIVER, StorageDriver } from './storage/storage.driver';

/** Allowed image types, checked against the file's real bytes rather than the browser-supplied MIME type. */
const IMAGE_SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', ext: '.jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    ext: '.png',
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    ext: '.webp',
    test: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  {
    mime: 'image/avif',
    ext: '.avif',
    test: (b) => b.toString('ascii', 4, 8) === 'ftyp' && /^avi[fs]$/.test(b.toString('ascii', 8, 12)),
  },
];

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(@Inject(STORAGE_DRIVER) private readonly driver: StorageDriver) {}

  /** Returns the image's real type, or null if it isn't a supported image. */
  detectImage(body: Buffer) {
    return IMAGE_SIGNATURES.find((s) => s.test(body)) ?? null;
  }

  /** Stores an image under `<folder>/<uuid><ext>` and returns its public URL. */
  async putImage(folder: string, body: Buffer) {
    const type = this.detectImage(body);
    if (!type) throw new Error('Unsupported image type');
    return this.driver.put(`${folder}/${randomUUID()}${type.ext}`, body, type.mime);
  }

  /**
   * Deletes files that this storage owns. URLs that point anywhere else (seed images,
   * external links) are skipped. Failures are logged, not thrown, so a storage hiccup
   * never blocks deleting or editing a vehicle.
   */
  async deleteByUrls(urls: (string | null | undefined)[]) {
    const prefix = `${this.driver.publicBaseUrl}/`;
    const keys = [...new Set(urls)]
      .filter((u): u is string => !!u && u.startsWith(prefix))
      .map((u) => decodeURIComponent(u.slice(prefix.length).split('?')[0]));

    await Promise.all(
      keys.map((key) =>
        this.driver.delete(key).catch((err) => this.logger.warn(`Could not delete ${key}: ${err}`)),
      ),
    );
  }
}
