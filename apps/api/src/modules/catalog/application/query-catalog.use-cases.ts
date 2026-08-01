import { Inject, Injectable } from '@nestjs/common';
import {
  GENRES,
  MATURITY_WEIGHT,
  MOODS,
  type MaturityRating,
  type PaginatedResponse,
  type SearchResultDto,
  type TitleDetailDto,
  type TitleSummaryDto,
  type TitleKind,
} from '@nova/shared';

import { CACHE_PORT, CLOCK_PORT, type CachePort, type ClockPort } from '../../../common/application/ports';
import { EntityNotFound } from '../../../common/domain/domain.exceptions';
import { TITLE_REPOSITORY, type TitleQuery, type TitleRepository } from '../domain/title.repository';
import { TitleMapper } from './title.mapper';

/** Cache TTL of catalog listings, in seconds. */
const CATALOG_CACHE_TTL = 60;

/** Paginated, filtered catalog listing used by the category pages. */
@Injectable()
export class ListTitlesUseCase {
  /**
   * @param titles - Catalog repository.
   * @param cache - Cache port.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param query - Filters, sorting and paging.
   * @returns Page of titles with pagination metadata.
   */
  public async execute(query: TitleQuery): Promise<PaginatedResponse<TitleSummaryDto>> {
    const cacheKey = `catalog:list:${JSON.stringify(query)}`;

    return this.cache.wrap(cacheKey, CATALOG_CACHE_TTL, async () => {
      const { items, total } = await this.titles.list(query);
      const now = this.clock.now();
      const perPage = query.perPage ?? 24;

      return {
        data: items.map((title) => TitleMapper.toSummary(title, now)),
        meta: {
          page: query.page ?? 1,
          perPage,
          total,
          totalPages: Math.max(1, Math.ceil(total / perPage)),
        },
      };
    });
  }
}

/** Loads a single title with its seasons, credits and similar entries. */
@Injectable()
export class GetTitleUseCase {
  /**
   * @param titles - Catalog repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param slugOrId - URL slug or identifier.
   * @returns Full title detail.
   * @throws {EntityNotFound} When no entry matches.
   */
  public async execute(slugOrId: string): Promise<TitleDetailDto> {
    const title = (await this.titles.findBySlug(slugOrId)) ?? (await this.titles.findById(slugOrId));
    if (!title) {
      throw new EntityNotFound('Tartalom', slugOrId);
    }

    // "Similar" is genre overlap ranked by popularity — cheap, explainable and
    // good enough until the collaborative-filtering service is in place.
    const { items } = await this.titles.list({ perPage: 60, sort: 'popularity' });
    const similar = items
      .filter((candidate) => candidate.id !== title.id)
      .map((candidate) => ({
        id: candidate.id,
        overlap: candidate.genres.filter((genre) => title.genres.includes(genre)).length,
        popularity: candidate.popularity,
      }))
      .filter((candidate) => candidate.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || b.popularity - a.popularity)
      .slice(0, 12)
      .map((candidate) => candidate.id);

    return TitleMapper.toDetail(title, this.clock.now(), similar);
  }
}

/** Free-text search across names, genres, cast and synopses. */
@Injectable()
export class SearchTitlesUseCase {
  /**
   * @param titles - Catalog repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param term - Raw search term.
   * @param maturityLevel - Profile restriction applied to the results.
   * @returns Scored results, best match first.
   */
  public async execute(term: string, maturityLevel?: MaturityRating): Promise<SearchResultDto[]> {
    const needle = term.trim().toLowerCase();
    if (needle.length < 2) {
      return [];
    }

    const { items } = await this.titles.list({
      search: needle,
      perPage: 60,
      maxMaturityWeight: maturityLevel ? MATURITY_WEIGHT[maturityLevel] : undefined,
    });
    const now = this.clock.now();

    return items
      .map((title) => {
        const snapshot = title.snapshot();
        const name = snapshot.name.toLowerCase();

        // Ranking: exact name > name prefix > genre/cast > synopsis.
        let score = 0;
        let matchedOn: SearchResultDto['matchedOn'] = 'synopsis';

        if (name === needle) {
          score = 100;
          matchedOn = 'name';
        } else if (name.startsWith(needle)) {
          score = 90;
          matchedOn = 'name';
        } else if (name.includes(needle)) {
          score = 75;
          matchedOn = 'name';
        } else if (snapshot.genres.some((genre) => genre.toLowerCase().includes(needle))) {
          score = 60;
          matchedOn = 'genre';
        } else if (snapshot.cast.some((member) => member.toLowerCase().includes(needle))) {
          score = 55;
          matchedOn = 'cast';
        } else if (snapshot.moods.some((mood) => mood.toLowerCase().includes(needle))) {
          score = 45;
          matchedOn = 'mood';
        } else {
          score = 30;
        }

        return {
          title: TitleMapper.toSummary(title, now),
          score: score + snapshot.popularity / 10,
          matchedOn,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

/** Serves the genre and mood filter lists of the browse navigation. */
@Injectable()
export class ListGenresUseCase {
  /**
   * @returns Available genres and moods.
   */
  public execute(): { genres: string[]; moods: string[] } {
    return { genres: [...GENRES], moods: [...MOODS] };
  }
}

/** Builds the "Top 10 ma" list. */
@Injectable()
export class GetTopTenUseCase {
  /**
   * @param titles - Catalog repository.
   * @param cache - Cache port.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param kind - Optional restriction to movies or series.
   * @returns Ten titles ordered by popularity.
   */
  public async execute(kind?: TitleKind): Promise<TitleSummaryDto[]> {
    return this.cache.wrap(`catalog:top10:${kind ?? 'all'}`, CATALOG_CACHE_TTL, async () => {
      const { items } = await this.titles.list({ kind, perPage: 10, sort: 'popularity' });
      const now = this.clock.now();
      return items.map((title) => TitleMapper.toSummary(title, now));
    });
  }
}

/** Builds the "Újdonságok" page: recently published and trending entries. */
@Injectable()
export class GetNewAndPopularUseCase {
  /**
   * @param titles - Catalog repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @returns Newly published, trending and upcoming-original selections.
   */
  public async execute(): Promise<{
    newReleases: TitleSummaryDto[];
    trending: TitleSummaryDto[];
    originals: TitleSummaryDto[];
  }> {
    const now = this.clock.now();
    const [newest, trending, originals] = await Promise.all([
      this.titles.list({ perPage: 20, sort: 'newest' }),
      this.titles.list({ perPage: 20, sort: 'trending' }),
      this.titles.list({ perPage: 20, sort: 'newest', onlyOriginals: true }),
    ]);

    return {
      newReleases: newest.items.map((title) => TitleMapper.toSummary(title, now)),
      trending: trending.items.map((title) => TitleMapper.toSummary(title, now)),
      originals: originals.items.map((title) => TitleMapper.toSummary(title, now)),
    };
  }
}
