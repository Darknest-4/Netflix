import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BRAND_NAME } from '@nova/shared';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

/**
 * Boots the HTTP server.
 *
 * Installs security headers, compression, CORS, global validation and the
 * OpenAPI explorer, then starts listening on the configured port.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfig, true>);
  const appConfig = config.get('app', { infer: true });

  app.setGlobalPrefix(appConfig.apiPrefix);
  app.enableShutdownHooks();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser());

  // The raw body is required to verify payment provider webhook signatures.
  app.use(
    json({
      limit: '2mb',
      verify: (request, _response, buffer) => {
        (request as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      },
    }),
  );
  app.use(urlencoded({ extended: true }));

  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const openApi = new DocumentBuilder()
    .setTitle(`${BRAND_NAME} API`)
    .setDescription(
      'A NOVA streaming platform REST API-ja. Clean Architecture, DDD határokkal és moduláris felépítéssel.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    `${appConfig.apiPrefix}/docs`,
    app,
    SwaggerModule.createDocument(app, openApi),
    { customSiteTitle: `${BRAND_NAME} API dokumentáció` },
  );

  await app.listen(appConfig.port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`${BRAND_NAME} API fut: http://localhost:${appConfig.port}/${appConfig.apiPrefix}`);
  logger.log(`OpenAPI dokumentáció: http://localhost:${appConfig.port}/${appConfig.apiPrefix}/docs`);
}

void bootstrap();
