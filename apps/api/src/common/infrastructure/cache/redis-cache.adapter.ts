import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import type { CachePort } from '../../application/ports';

/**
 * Redis backed cache adapter.
 *
 * Bound whenever `REDIS_URL` is present. Values are stored as JSON so they can
 * be inspected with `redis-cli` and shared between API replicas.
 */
@Injectable()
export class RedisCacheAdapter implements CachePort, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheAdapter.name);
  private readonly client: Redis;

  /**
   * @param url - Redis connection string.
   * @param defaultTtlSeconds - TTL applied when a caller omits one.
   */
  public constructor(
    url: string,
    private readonly defaultTtlSeconds: number,
  ) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 3_000),
    });
    this.client.on('error', (error: Error) => this.logger.warn(`Redis hiba: ${error.message}`));
    this.logger.log('Redis cache adapter aktív.');
  }

  /** @inheritdoc */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.warn(`Cache olvasás sikertelen (${key}): ${(error as Error).message}`);
      return null;
    }
  }

  /** @inheritdoc */
  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds ?? this.defaultTtlSeconds);
    } catch (error) {
      this.logger.warn(`Cache írás sikertelen (${key}): ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  public async del(key: string): Promise<void> {
    await this.client.del(key).catch(() => undefined);
  }

  /** @inheritdoc */
  public async delByPattern(pattern: string): Promise<void> {
    // SCAN instead of KEYS: never block the Redis event loop in production.
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) {
        await this.client.del(...keys).catch(() => undefined);
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

  /** Closes the connection when the Nest application shuts down. */
  public async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}
