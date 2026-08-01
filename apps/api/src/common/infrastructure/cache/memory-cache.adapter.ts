import { Injectable, Logger } from '@nestjs/common';

import type { CachePort } from '../../application/ports';

/** Internal cache entry with its absolute expiry. */
interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * In-process cache adapter.
 *
 * Used whenever `REDIS_URL` is not configured (local development, unit tests,
 * single-node demo deployments). The eviction policy is lazy: expired keys are
 * dropped on read and by a periodic sweep.
 */
@Injectable()
export class MemoryCacheAdapter implements CachePort {
  private readonly logger = new Logger(MemoryCacheAdapter.name);
  private readonly store = new Map<string, CacheEntry>();
  private readonly sweeper: NodeJS.Timeout;

  public constructor() {
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    // Never keep the Node process alive just for cache maintenance.
    this.sweeper.unref?.();
    this.logger.log('Memória cache adapter aktív (Redis nincs konfigurálva).');
  }

  /** @inheritdoc */
  public async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /** @inheritdoc */
  public async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  /** @inheritdoc */
  public async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** @inheritdoc */
  public async delByPattern(pattern: string): Promise<void> {
    const matcher = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    for (const key of this.store.keys()) {
      if (matcher.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /** @inheritdoc */
  public async wrap<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /** Drops every expired entry. */
  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
