import {
  DeleteObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { StorageDriver } from './storage.driver';

export interface S3DriverOptions {
  bucket: string;
  region: string;
  /** Leave empty for AWS. Set for R2 / Spaces / B2 / MinIO, e.g. https://<account>.r2.cloudflarestorage.com */
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  /** Needed by MinIO and some self-hosted services. */
  forcePathStyle: boolean;
  /** Public URL prefix that serves the bucket: CDN, R2 public domain, CloudFront… */
  publicUrl?: string;
  /** e.g. `public-read`. Leave empty when the bucket is public via a bucket policy (and always on R2). */
  acl?: string;
}

/** Works with any S3-compatible service: AWS S3, Cloudflare R2, DigitalOcean Spaces, Backblaze B2, MinIO, Wasabi. */
export class S3StorageDriver implements StorageDriver {
  readonly publicBaseUrl: string;
  private readonly client: S3Client;

  constructor(private readonly opts: S3DriverOptions) {
    this.client = new S3Client({
      region: opts.region,
      endpoint: opts.endpoint || undefined,
      forcePathStyle: opts.forcePathStyle,
      // Without explicit keys, the SDK falls back to its default chain (IAM role, ~/.aws, env vars).
      credentials:
        opts.accessKeyId && opts.secretAccessKey
          ? { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey }
          : undefined,
    });
    this.publicBaseUrl = (opts.publicUrl || this.defaultPublicUrl()).replace(/\/+$/, '');
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.opts.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // File names are random UUIDs, so they never change and can be cached for good.
        CacheControl: 'public, max-age=31536000, immutable',
        ACL: (this.opts.acl as ObjectCannedACL) || undefined,
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.opts.bucket, Key: key }));
  }

  private defaultPublicUrl() {
    const { bucket, region, endpoint, forcePathStyle } = this.opts;
    if (endpoint) {
      const base = endpoint.replace(/\/+$/, '');
      if (forcePathStyle) return `${base}/${bucket}`;
      const url = new URL(base);
      return `${url.protocol}//${bucket}.${url.host}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }
}
