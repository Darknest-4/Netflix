import type { TitleKind } from '@nova/shared';

import type { Title } from './title.entity';

/** Filters accepted by {@link TitleRepository.list}. */
export interface TitleQuery {
  page?: number;
  perPage?: number;
  kind?: TitleKind;
  genre?: string;
  mood?: string;
  /** Free-text query matched against name, cast, genres and synopsis. */
  search?: string;
  /** When set, entries above this rating are excluded (parental control). */
  maxMaturityWeight?: number;
  onlyOriginals?: boolean;
  includeUnpublished?: boolean;
  sort?: 'popularity' | 'newest' | 'trending' | 'name';
}

/** Outbound port of the catalog aggregate. */
export interface TitleRepository {
  /**
   * @param id - Title identifier.
   * @returns The aggregate, or `null`.
   */
  findById(id: string): Promise<Title | null>;

  /**
   * @param slug - URL identifier.
   * @returns The aggregate, or `null`.
   */
  findBySlug(slug: string): Promise<Title | null>;

  /**
   * @param ids - Title identifiers.
   * @returns Every matching aggregate, order unspecified.
   */
  findManyByIds(ids: string[]): Promise<Title[]>;

  /**
   * Paginated, filtered listing.
   *
   * @param query - Filters, sorting and paging.
   * @returns Page of aggregates plus the total count.
   */
  list(query: TitleQuery): Promise<{ items: Title[]; total: number }>;

  /**
   * Inserts or updates an aggregate (CMS write path).
   *
   * @param title - Aggregate to persist.
   */
  save(title: Title): Promise<void>;

  /**
   * @param id - Title identifier.
   */
  delete(id: string): Promise<void>;

  /** @returns Total number of catalog entries. */
  count(): Promise<number>;

  /**
   * @param limit - Maximum number of entries.
   * @returns The most watched entries, most popular first.
   */
  topByPopularity(limit: number): Promise<Title[]>;
}

/** Injection token of {@link TitleRepository}. */
export const TITLE_REPOSITORY = Symbol('TitleRepository');
