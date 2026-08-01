import { Inject, Injectable } from '@nestjs/common';
import {
  MaturityRating,
  TitleKind,
  type PaginatedResponse,
  type TitleDetailDto,
  type TitleSummaryDto,
  slugify,
} from '@nova/shared';

import {
  CACHE_PORT,
  CLOCK_PORT,
  EVENT_BUS_PORT,
  ID_GENERATOR_PORT,
  type CachePort,
  type ClockPort,
  type EventBusPort,
  type IdGeneratorPort,
} from '../../../common/application/ports';
import { EntityNotFound } from '../../../common/domain/domain.exceptions';
import { Title, type SeasonProps } from '../domain/title.entity';
import { TITLE_REPOSITORY, type TitleRepository } from '../domain/title.repository';
import { TitleMapper } from './title.mapper';

/** Editorial payload accepted by the CMS create/update endpoints. */
export interface UpsertTitleInput {
  name: string;
  kind: TitleKind;
  tagline?: string;
  synopsis: string;
  releaseYear: number;
  maturityRating: MaturityRating;
  durationSeconds?: number | null;
  genres?: string[];
  moods?: string[];
  cast?: string[];
  directors?: string[];
  writers?: string[];
  country?: string;
  languages?: string[];
  subtitleLanguages?: string[];
  audioLanguages?: string[];
  isOriginal?: boolean;
  isPublished?: boolean;
  popularity?: number;
  seasons?: Array<{
    seasonNumber: number;
    name?: string;
    episodes: Array<{
      episodeNumber: number;
      name: string;
      synopsis?: string;
      durationSeconds: number;
    }>;
  }>;
}

/** Creates a catalog entry from the admin CMS. */
@Injectable()
export class CreateTitleUseCase {
  /**
   * @param titles - Catalog repository.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   * @param cache - Cache port, invalidated after every write.
   * @param eventBus - Domain event publisher.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * @param input - Editorial payload.
   * @returns The created entry.
   */
  public async execute(input: UpsertTitleInput): Promise<TitleDetailDto> {
    const id = this.ids.generate();
    const now = this.clock.now();
    const slug = slugify(input.name);

    const title = Title.create({
      id,
      slug,
      name: input.name,
      kind: input.kind,
      tagline: input.tagline ?? '',
      synopsis: input.synopsis,
      releaseYear: input.releaseYear,
      maturityRating: input.maturityRating,
      durationSeconds: input.durationSeconds ?? null,
      genres: input.genres ?? [],
      moods: input.moods ?? [],
      cast: input.cast ?? [],
      directors: input.directors ?? [],
      writers: input.writers ?? [],
      country: input.country ?? 'HU',
      languages: input.languages ?? ['hu'],
      subtitleLanguages: input.subtitleLanguages ?? ['hu', 'en'],
      audioLanguages: input.audioLanguages ?? ['hu'],
      isOriginal: input.isOriginal ?? false,
      isPublished: input.isPublished ?? false,
      popularity: input.popularity ?? 50,
      trendingScore: 0,
      trailerAssetKey: `${slug}/trailer/master.m3u8`,
      assetKey: input.kind === TitleKind.MOVIE ? `${slug}/feature/master.m3u8` : null,
      publishedAt: now,
      seasons: buildSeasons(id, slug, input.seasons ?? []),
    });

    await this.titles.save(title);
    await this.cache.delByPattern('catalog:*');
    await this.eventBus.publish('catalog.updated', { titleId: title.id });

    return TitleMapper.toDetail(title, now);
  }
}

/** Updates an existing catalog entry. */
@Injectable()
export class UpdateTitleUseCase {
  /**
   * @param titles - Catalog repository.
   * @param clock - Wall clock.
   * @param cache - Cache port.
   * @param eventBus - Domain event publisher.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * @param id - Entry to update.
   * @param input - Fields to change.
   * @returns The updated entry.
   * @throws {EntityNotFound} When the entry does not exist.
   */
  public async execute(id: string, input: Partial<UpsertTitleInput>): Promise<TitleDetailDto> {
    const title = await this.titles.findById(id);
    if (!title) {
      throw new EntityNotFound('Tartalom', id);
    }

    const slug = input.name ? slugify(input.name) : title.slug;

    title.update({
      ...(input.name !== undefined ? { name: input.name, slug } : {}),
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.synopsis !== undefined ? { synopsis: input.synopsis } : {}),
      ...(input.releaseYear !== undefined ? { releaseYear: input.releaseYear } : {}),
      ...(input.maturityRating !== undefined ? { maturityRating: input.maturityRating } : {}),
      ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
      ...(input.genres !== undefined ? { genres: input.genres } : {}),
      ...(input.moods !== undefined ? { moods: input.moods } : {}),
      ...(input.cast !== undefined ? { cast: input.cast } : {}),
      ...(input.directors !== undefined ? { directors: input.directors } : {}),
      ...(input.writers !== undefined ? { writers: input.writers } : {}),
      ...(input.isOriginal !== undefined ? { isOriginal: input.isOriginal } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      ...(input.popularity !== undefined ? { popularity: input.popularity } : {}),
      ...(input.seasons !== undefined
        ? { seasons: buildSeasons(title.id, slug, input.seasons) }
        : {}),
    });

    await this.titles.save(title);
    await this.cache.delByPattern('catalog:*');
    await this.eventBus.publish('catalog.updated', { titleId: title.id });

    return TitleMapper.toDetail(title, this.clock.now());
  }
}

/** Deletes a catalog entry. */
@Injectable()
export class DeleteTitleUseCase {
  /**
   * @param titles - Catalog repository.
   * @param cache - Cache port.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
  ) {}

  /**
   * @param id - Entry to delete.
   * @throws {EntityNotFound} When the entry does not exist.
   */
  public async execute(id: string): Promise<void> {
    if (!(await this.titles.findById(id))) {
      throw new EntityNotFound('Tartalom', id);
    }
    await this.titles.delete(id);
    await this.cache.delByPattern('catalog:*');
  }
}

/** Lists every entry — including unpublished drafts — for the CMS table. */
@Injectable()
export class ListTitlesForAdminUseCase {
  /**
   * @param titles - Catalog repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param params - Paging and search parameters.
   * @returns Page of entries with pagination metadata.
   */
  public async execute(params: {
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<PaginatedResponse<TitleSummaryDto>> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;

    const { items, total } = await this.titles.list({
      page,
      perPage,
      search: params.search,
      includeUnpublished: true,
      sort: 'newest',
    });
    const now = this.clock.now();

    return {
      data: items.map((title) => TitleMapper.toSummary(title, now)),
      meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    };
  }
}

/**
 * Converts CMS season input into aggregate state.
 *
 * @param titleId - Owning title.
 * @param slug - Title slug, used to derive asset keys.
 * @param seasons - Season payload from the CMS.
 * @returns Season props ready for the aggregate.
 */
function buildSeasons(
  titleId: string,
  slug: string,
  seasons: NonNullable<UpsertTitleInput['seasons']>,
): SeasonProps[] {
  return seasons.map((season) => ({
    id: `${titleId}-s${season.seasonNumber}`,
    seasonNumber: season.seasonNumber,
    name: season.name ?? `${season.seasonNumber}. évad`,
    episodes: season.episodes.map((episode) => ({
      id: `${titleId}-s${season.seasonNumber}e${episode.episodeNumber}`,
      seasonNumber: season.seasonNumber,
      episodeNumber: episode.episodeNumber,
      name: episode.name,
      synopsis: episode.synopsis ?? '',
      durationSeconds: episode.durationSeconds,
      assetKey: `${slug}/s${season.seasonNumber}/e${episode.episodeNumber}/master.m3u8`,
    })),
  }));
}
