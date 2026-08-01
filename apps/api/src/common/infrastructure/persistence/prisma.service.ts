import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PostgreSQL connection handle.
 *
 * The service is always instantiable, but it only opens a connection when a
 * `DATABASE_URL` is present. `isConnected` lets repository factories decide
 * between the Prisma and the in-memory adapter without try/catch noise.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** True once the connection has been established successfully. */
  public isConnected = false;

  public constructor() {
    super({ log: [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }] });
  }

  /**
   * Opens the connection pool at application start.
   *
   * A failure is logged but never fatal: the API falls back to the in-memory
   * repositories so local development and demos keep working.
   */
  public async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      this.logger.warn('DATABASE_URL nincs beállítva — memória-adapterek használata.');
      return;
    }

    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('PostgreSQL kapcsolat létrejött.');
    } catch (error) {
      this.logger.error(`PostgreSQL kapcsolat sikertelen: ${(error as Error).message}`);
    }
  }

  /** Closes the connection pool on shutdown. */
  public async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
