import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  MaturityRating,
  TitleKind,
  type PaginatedResponse,
  type SearchResultDto,
  type TitleDetailDto,
  type TitleSummaryDto,
} from '@nova/shared';

import { Public } from '../../../common/presentation/decorators';
import {
  GetNewAndPopularUseCase,
  GetTitleUseCase,
  GetTopTenUseCase,
  ListGenresUseCase,
  ListTitlesUseCase,
  SearchTitlesUseCase,
} from '../application/query-catalog.use-cases';

/**
 * Public catalog endpoints.
 *
 * Marked `@Public()` so the landing page and SEO crawlers can render title
 * information without a session; personalised rows live behind
 * `/recommendations` and require authentication.
 */
@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  /**
   * @param listTitles - Listing use case.
   * @param getTitle - Detail use case.
   * @param searchTitles - Search use case.
   * @param listGenres - Genre/mood listing.
   * @param getTopTen - Top 10 use case.
   * @param getNewAndPopular - New & popular use case.
   */
  public constructor(
    private readonly listTitles: ListTitlesUseCase,
    private readonly getTitle: GetTitleUseCase,
    private readonly searchTitles: SearchTitlesUseCase,
    private readonly listGenres: ListGenresUseCase,
    private readonly getTopTen: GetTopTenUseCase,
    private readonly getNewAndPopular: GetNewAndPopularUseCase,
  ) {}

  /**
   * @param page - 1-based page index.
   * @param perPage - Page size.
   * @param kind - Optional movie/series filter.
   * @param genre - Optional genre filter.
   * @param mood - Optional mood filter.
   * @param sort - Ordering key.
   * @returns Page of catalog entries.
   */
  @Public()
  @Get('titles')
  @ApiOperation({ summary: 'Katalógus listázása szűrőkkel' })
  public async titles(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('kind') kind?: TitleKind,
    @Query('genre') genre?: string,
    @Query('mood') mood?: string,
    @Query('sort') sort?: 'popularity' | 'newest' | 'trending' | 'name',
  ): Promise<PaginatedResponse<TitleSummaryDto>> {
    return this.listTitles.execute({
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 24,
      kind,
      genre,
      mood,
      sort,
    });
  }

  /**
   * @returns Genre and mood filter options.
   */
  @Public()
  @Get('genres')
  @ApiOperation({ summary: 'Kategóriák és hangulatok' })
  public genres(): { genres: string[]; moods: string[] } {
    return this.listGenres.execute();
  }

  /**
   * @param kind - Optional movie/series restriction.
   * @returns The ten most popular entries.
   */
  @Public()
  @Get('top-ten')
  @ApiOperation({ summary: 'Top 10 lista' })
  public async topTen(@Query('kind') kind?: TitleKind): Promise<TitleSummaryDto[]> {
    return this.getTopTen.execute(kind);
  }

  /**
   * @returns New releases, trending entries and originals.
   */
  @Public()
  @Get('new-and-popular')
  @ApiOperation({ summary: 'Újdonságok és népszerű tartalmak' })
  public async newAndPopular(): Promise<{
    newReleases: TitleSummaryDto[];
    trending: TitleSummaryDto[];
    originals: TitleSummaryDto[];
  }> {
    return this.getNewAndPopular.execute();
  }

  /**
   * @param term - Search term.
   * @param maturityLevel - Optional parental restriction.
   * @returns Ranked search results.
   */
  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Keresés a katalógusban' })
  public async search(
    @Query('q') term = '',
    @Query('maturityLevel') maturityLevel?: MaturityRating,
  ): Promise<SearchResultDto[]> {
    return this.searchTitles.execute(term, maturityLevel);
  }

  /**
   * @param slug - URL slug or identifier.
   * @returns Full title detail.
   */
  @Public()
  @Get('titles/:slug')
  @ApiOperation({ summary: 'Film / sorozat adatlap' })
  public async detail(@Param('slug') slug: string): Promise<TitleDetailDto> {
    return this.getTitle.execute(slug);
  }
}
