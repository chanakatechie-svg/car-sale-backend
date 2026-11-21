/** Where uploaded files live. Pick one with STORAGE_DRIVER in .env. */
export interface StorageDriver {
  /** Stores the file under `key` (e.g. `vehicles/<uuid>.jpg`) and returns its public URL. */
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  /** Deletes the file at `key`. Does nothing if it doesn't exist. */
  delete(key: string): Promise<void>;
  /** Public URL prefix for stored files (no trailing slash). Used to tell our files apart from external URLs. */
  readonly publicBaseUrl: string;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
