import { Controller, Get, Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BRAND_NAME } from '@nova/shared';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { configuration, type AppConfig } from './config/configuration';
import { InfrastructureModule } from './common/infrastructure/infrastructure.module';
import { AllExceptionsFilter } from './common/presentation/filters/all-exceptions.filter';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from './common/presentation/interceptors/transform.interceptor';
import { JwtAuthGuard, RolesGuard } from './common/presentation/guards';
import { Public } from './common/presentation/decorators';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BillingModule } from './modules/billing/billing.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { IdentityModule } from './modules/identity/identity.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlaybackModule } from './modules/playback/playback.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';

/** Liveness and readiness endpoint used by Kubernetes probes. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  /**
   * @returns Service name, status and uptime.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Állapotellenőrzés' })
  public health(): { status: string; service: string; uptimeSeconds: number; version: string } {
    return {
      status: 'ok',
      service: `${BRAND_NAME} API`,
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? '1.0.0',
    };
  }
}

/**
 * Composition root.
 *
 * Wires the bounded contexts together and installs the global guard,
 * interceptor and filter chain. Business logic never lives here.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], cache: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const security = config.get('security', { infer: true });
        return [{ name: 'default', ttl: security.throttleTtlMs, limit: security.throttleLimit }];
      },
    }),
    InfrastructureModule,
    IdentityModule,
    ProfilesModule,
    CatalogModule,
    WatchlistModule,
    PlaybackModule,
    RecommendationsModule,
    BillingModule,
    NotificationsModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  /**
   * Installs the correlation-id middleware.
   *
   * Every request gets an `x-request-id`, which is echoed back on the response
   * and included in both the access log and error payloads.
   *
   * @param consumer - Nest middleware consumer.
   */
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((request: Request, response: Response, next: NextFunction) => {
        const requestId = (request.headers['x-request-id'] as string) ?? randomUUID();
        request.headers['x-request-id'] = requestId;
        response.setHeader('x-request-id', requestId);
        next();
      })
      .forRoutes('*');
  }
}
