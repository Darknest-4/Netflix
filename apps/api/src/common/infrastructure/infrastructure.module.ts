import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';
import {
  CACHE_PORT,
  CLOCK_PORT,
  EVENT_BUS_PORT,
  ID_GENERATOR_PORT,
  MAILER_PORT,
  PUSH_SENDER_PORT,
  STORAGE_PORT,
} from '../application/ports';
import { MemoryCacheAdapter } from './cache/memory-cache.adapter';
import { RedisCacheAdapter } from './cache/redis-cache.adapter';
import { ConsoleMailerAdapter, SmtpMailerAdapter } from './mail/mailer.adapters';
import { PrismaService } from './persistence/prisma.service';
import { S3StorageAdapter } from './storage/s3-storage.adapter';
import { InMemoryEventBus, SystemClock, UuidGenerator, WebPushSender } from './system/system.providers';

/**
 * Binds every outbound port to a concrete adapter.
 *
 * Each binding inspects the runtime configuration and picks the production
 * adapter when its integration is configured, or a self-contained development
 * adapter otherwise. This is the only module in the codebase that knows which
 * infrastructure actually exists.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: CACHE_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redis = config.get('redis', { infer: true });
        return redis.url
          ? new RedisCacheAdapter(redis.url, redis.ttlSeconds)
          : new MemoryCacheAdapter();
      },
    },
    {
      provide: MAILER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const mail = config.get('mail', { infer: true });
        return mail.host
          ? new SmtpMailerAdapter({
              host: mail.host,
              port: mail.port,
              user: mail.user,
              password: mail.password,
              from: mail.from,
            })
          : new ConsoleMailerAdapter();
      },
    },
    {
      provide: STORAGE_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new S3StorageAdapter(config.get('storage', { infer: true })),
    },
    {
      provide: PUSH_SENDER_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new WebPushSender(config.get('push', { infer: true })),
    },
    { provide: EVENT_BUS_PORT, useClass: InMemoryEventBus },
    { provide: CLOCK_PORT, useClass: SystemClock },
    { provide: ID_GENERATOR_PORT, useClass: UuidGenerator },
  ],
  exports: [
    PrismaService,
    CACHE_PORT,
    MAILER_PORT,
    STORAGE_PORT,
    PUSH_SENDER_PORT,
    EVENT_BUS_PORT,
    CLOCK_PORT,
    ID_GENERATOR_PORT,
  ],
})
export class InfrastructureModule {}
