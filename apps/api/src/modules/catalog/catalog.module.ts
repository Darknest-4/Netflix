import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../common/infrastructure/persistence/prisma.service';
import type { AppConfig } from '../../config/configuration';
import {
  CreateTitleUseCase,
  DeleteTitleUseCase,
  ListTitlesForAdminUseCase,
  UpdateTitleUseCase,
} from './application/manage-catalog.use-cases';
import {
  GetNewAndPopularUseCase,
  GetTitleUseCase,
  GetTopTenUseCase,
  ListGenresUseCase,
  ListTitlesUseCase,
  SearchTitlesUseCase,
} from './application/query-catalog.use-cases';
import { TITLE_REPOSITORY } from './domain/title.repository';
import { InMemoryTitleRepository } from './infrastructure/in-memory-title.repository';
import { PrismaTitleRepository } from './infrastructure/prisma-title.repository';
import { AdminCatalogController } from './presentation/admin-catalog.controller';
import { CatalogController } from './presentation/catalog.controller';

/**
 * Catalog bounded context: titles, seasons, episodes, search and the CMS.
 *
 * This module has no dependency on any other bounded context, which is what
 * lets watchlist, playback and recommendations all build on top of it without
 * creating a cycle.
 */
@Module({
  controllers: [CatalogController, AdminCatalogController],
  providers: [
    ListTitlesUseCase,
    GetTitleUseCase,
    SearchTitlesUseCase,
    ListGenresUseCase,
    GetTopTenUseCase,
    GetNewAndPopularUseCase,
    CreateTitleUseCase,
    UpdateTitleUseCase,
    DeleteTitleUseCase,
    ListTitlesForAdminUseCase,
    {
      provide: TITLE_REPOSITORY,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService<AppConfig, true>, prisma: PrismaService) =>
        config.get('database', { infer: true }).driver === 'prisma'
          ? new PrismaTitleRepository(prisma)
          : new InMemoryTitleRepository(),
    },
  ],
  exports: [TITLE_REPOSITORY, GetTitleUseCase, ListTitlesUseCase, GetTopTenUseCase],
})
export class CatalogModule {}
