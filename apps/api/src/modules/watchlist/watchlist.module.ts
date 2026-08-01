import { Controller, Delete, Get, Module, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TitleSummaryDto } from '@nova/shared';

import { PrismaService } from '../../common/infrastructure/persistence/prisma.service';
import type { AppConfig } from '../../config/configuration';
import { CatalogModule } from '../catalog/catalog.module';
import {
  ListWatchlistUseCase,
  ToggleWatchlistUseCase,
} from './application/manage-watchlist.use-cases';
import { WATCHLIST_REPOSITORY } from './domain/watchlist.repository';
import {
  InMemoryWatchlistRepository,
  PrismaWatchlistRepository,
} from './infrastructure/watchlist.repositories';

/** "Saját lista" endpoints, scoped to a viewing profile. */
@ApiTags('watchlist')
@Controller('profiles/:profileId/watchlist')
export class WatchlistController {
  /**
   * @param listWatchlist - Listing use case.
   * @param toggleWatchlist - Add/remove use case.
   */
  public constructor(
    private readonly listWatchlist: ListWatchlistUseCase,
    private readonly toggleWatchlist: ToggleWatchlistUseCase,
  ) {}

  /**
   * @param profileId - Viewing profile.
   * @returns Saved titles.
   */
  @Get()
  @ApiOperation({ summary: 'A profil saját listája' })
  public async list(@Param('profileId') profileId: string): Promise<TitleSummaryDto[]> {
    return this.listWatchlist.execute(profileId);
  }

  /**
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry.
   * @returns Membership state after the toggle.
   */
  @Post(':titleId')
  @ApiOperation({ summary: 'Tartalom hozzáadása / eltávolítása' })
  public async toggle(
    @Param('profileId') profileId: string,
    @Param('titleId') titleId: string,
  ): Promise<{ inMyList: boolean }> {
    return this.toggleWatchlist.execute(profileId, titleId);
  }

  /**
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry.
   * @returns Membership state after the removal.
   */
  @Delete(':titleId')
  @ApiOperation({ summary: 'Tartalom eltávolítása a listáról' })
  public async remove(
    @Param('profileId') profileId: string,
    @Param('titleId') titleId: string,
  ): Promise<{ inMyList: boolean }> {
    const current = await this.listWatchlist.execute(profileId);
    if (current.some((title) => title.id === titleId)) {
      return this.toggleWatchlist.execute(profileId, titleId);
    }
    return { inMyList: false };
  }
}

/** Watchlist bounded context. */
@Module({
  imports: [CatalogModule],
  controllers: [WatchlistController],
  providers: [
    ListWatchlistUseCase,
    ToggleWatchlistUseCase,
    {
      provide: WATCHLIST_REPOSITORY,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService<AppConfig, true>, prisma: PrismaService) =>
        config.get('database', { infer: true }).driver === 'prisma'
          ? new PrismaWatchlistRepository(prisma)
          : new InMemoryWatchlistRepository(),
    },
  ],
  exports: [WATCHLIST_REPOSITORY, ListWatchlistUseCase],
})
export class WatchlistModule {}
