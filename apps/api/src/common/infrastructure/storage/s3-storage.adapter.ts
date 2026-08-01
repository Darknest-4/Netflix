import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';

import type { StoragePort } from '../../application/ports';

/**
 * S3 compatible object storage adapter (AWS S3, MinIO, Cloudflare R2).
 *
 * Pre-signed URLs are generated locally with SigV4-style HMAC signing, which
 * keeps the API free of the heavyweight AWS SDK. When no credentials are
 * configured the adapter degrades to unsigned public URLs so the demo catalog
 * still resolves.
 */
@Injectable()
export class S3StorageAdapter implements StoragePort {
  private readonly logger = new Logger(S3StorageAdapter.name);

  /**
   * @param options - Bucket, endpoint and credential configuration.
   */
  public constructor(
    private readonly options: {
      endpoint: string | null;
      region: string;
      bucket: string;
      accessKeyId: string | null;
      secretAccessKey: string | null;
      publicBaseUrl: string;
    },
  ) {
    if (!options.accessKeyId) {
      this.logger.log('S3 hitelesítés nincs beállítva — publikus URL-ek generálása.');
    }
  }

  /** @inheritdoc */
  public publicUrl(key: string): string {
    const base = this.options.publicBaseUrl.replace(/\/$/, '');
    return `${base}/${key.replace(/^\//, '')}`;
  }

  /** @inheritdoc */
  public async createUploadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const target = this.publicUrl(key);
    if (!this.options.accessKeyId || !this.options.secretAccessKey) {
      return `${target}?x-nova-simulated-upload=1&expires=${expiresInSeconds}`;
    }

    const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload = `PUT\n\n\n${expiry}\n/${this.options.bucket}/${key}`;
    const signature = createHmac('sha256', this.options.secretAccessKey)
      .update(payload)
      .digest('base64');

    const params = new URLSearchParams({
      'X-Amz-Credential': this.options.accessKeyId,
      'X-Amz-Expires': String(expiresInSeconds),
      'X-Amz-Signature': signature,
      'X-Amz-Region': this.options.region,
    });
    return `${target}?${params.toString()}`;
  }
}
