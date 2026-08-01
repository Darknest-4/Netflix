import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { BrowsePageDto } from '@nova/shared';

import { CatalogModule } from '../catalog/catalog.module';
import { PlaybackModule } from '../playback/playback.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { BuildBrowsePageUseCase } from './application/build-browse-page.use-case';

/** Personalised browse endpoints. */
@ApiTags('catalog')
@Controller('catalog')
export class BrowseController {
  /**
   * @param buildBrowsePage - Browse page assembly use case.
   */
  public constructor(private readonly buildBrowsePage: BuildBrowsePageUseCase) {}

  /**
   * @param profileId - Viewing profile the page is personalised for.
   * @param kind - Optional `MOVIE`/`SERIES` restriction.
   * @returns Billboard and personalised rows.
   */
  @Get('browse')
  @ApiOperation({ summary: 'Személyre szabott böngésző oldal' })
  public async browse(
    @Query('profileId') profileId: string,
    @Query('kind') kind?: 'MOVIE' | 'SERIES',
  ): Promise<BrowsePageDto> {
    return this.buildBrowsePage.execute(profileId, kind);
  }
}

/**
 * Recommendations bounded context.
 *
 * Sits above catalog, watchlist, playback and profiles: it is the only module
 * that composes data from several contexts, and it does so through their public
 * repository ports rather than their internals.
 */
@Module({
  imports: [CatalogModule, WatchlistModule, PlaybackModule, ProfilesModule],
  controllers: [BrowseController],
  providers: [BuildBrowsePageUseCase],
  exports: [BuildBrowsePageUseCase],
})
export class RecommendationsModule {}
