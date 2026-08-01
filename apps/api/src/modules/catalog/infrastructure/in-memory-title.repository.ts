import { Injectable } from '@nestjs/common';
import { MATURITY_WEIGHT } from '@nova/shared';

import { Title } from '../domain/title.entity';
import type { TitleQuery, TitleRepository } from '../domain/title.repository';
import { buildSeedCatalog } from './seed/catalog.seed';

/**
 * In-process catalog repository backed by the editorial seed dataset.
 *
 * Implements the same filtering, sorting and paging semantics as the Prisma
 * adapter, which is what lets the whole product run — browse, search, detail
 * pages, admin CMS — without a database.
 */
@Injectable()
export class InMemoryTitleRepository implements TitleRepository {
  private readonly titles = new Map<string, Title>();

  public constructor() {
    for (const props of buildSeedCatalog()) {
      this.titles.set(props.id, Title.rehydrate(props));
    }
  }

  /** @inheritdoc */
  public async findById(id: string): Promise<Title | null> {
    return this.titles.get(id) ?? null;
  }

  /** @inheritdoc */
  public async findBySlug(slug: string): Promise<Title | null> {
    for (const title of this.titles.values()) {
      if (title.slug === slug) {
        return title;
      }
    }
    return null;
  }

  /** @inheritdoc */
  public async findManyByIds(ids: string[]): Promise<Title[]> {
    return ids
      .map((id) => this.titles.get(id))
      .filter((title): title is Title => title !== undefined);
  }

  /** @inheritdoc */
  public async list(query: TitleQuery): Promise<{ items: Title[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(100, Math.max(1, query.perPage ?? 24));
    const search = query.search?.toLowerCase().trim();

    const filtered = [...this.titles.values()].filter((title) => {
      const snapshot = title.snapshot();

      if (!query.includeUnpublished && !title.isPublished) {
        return false;
      }
      if (query.kind && snapshot.kind !== query.kind) {
        return false;
      }
      if (query.genre && !snapshot.genres.includes(query.genre)) {
        return false;
      }
      if (query.mood && !snapshot.moods.includes(query.mood)) {
        return false;
      }
      if (query.onlyOriginals && !snapshot.isOriginal) {
        return false;
      }
      if (
        query.maxMaturityWeight !== undefined &&
        MATURITY_WEIGHT[snapshot.maturityRating] > query.maxMaturityWeight
      ) {
        return false;
      }
      if (search) {
        const haystack = [
          snapshot.name,
          snapshot.synopsis,
          snapshot.tagline,
          ...snapshot.genres,
          ...snapshot.moods,
          ...snapshot.cast,
          ...snapshot.directors,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }
      return true;
    });

    const sorted = InMemoryTitleRepository.sort(filtered, query.sort ?? 'popularity');
    const start = (page - 1) * perPage;

    return { items: sorted.slice(start, start + perPage), total: sorted.length };
  }

  /** @inheritdoc */
  public async save(title: Title): Promise<void> {
    this.titles.set(title.id, title);
  }

  /** @inheritdoc */
  public async delete(id: string): Promise<void> {
    this.titles.delete(id);
  }

  /** @inheritdoc */
  public async count(): Promise<number> {
    return this.titles.size;
  }

  /** @inheritdoc */
  public async topByPopularity(limit: number): Promise<Title[]> {
    return [...this.titles.values()]
      .filter((title) => title.isPublished)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Applies the requested ordering.
   *
   * @param titles - Filtered entries.
   * @param sort - Requested ordering.
   * @returns A new, sorted array.
   */
  private static sort(titles: Title[], sort: NonNullable<TitleQuery['sort']>): Title[] {
    const copy = [...titles];
    switch (sort) {
      case 'newest':
        return copy.sort(
          (a, b) => b.snapshot().publishedAt.getTime() - a.snapshot().publishedAt.getTime(),
        );
      case 'trending':
        return copy.sort((a, b) => b.trendingScore - a.trendingScore);
      case 'name':
        return copy.sort((a, b) => a.name.localeCompare(b.name, 'hu'));
      case 'popularity':
      default:
        return copy.sort((a, b) => b.popularity - a.popularity);
    }
  }
}
