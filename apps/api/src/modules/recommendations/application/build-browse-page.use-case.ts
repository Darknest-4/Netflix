import { Inject, Injectable } from '@nestjs/common';
import {
  MAX_ROW_ITEMS,
  MaturityRating,
  RecommendationReason,
  RowLayout,
  type BrowsePageDto,
  type CatalogRowDto,
  type TitleSummaryDto,
} from '@nova/shared';

import { CACHE_PORT, CLOCK_PORT, type CachePort, type ClockPort } from '../../../common/application/ports';
import { EntityNotFound } from '../../../common/domain/domain.exceptions';
import { TitleMapper } from '../../catalog/application/title.mapper';
import type { Title } from '../../catalog/domain/title.entity';
import { TITLE_REPOSITORY, type TitleRepository } from '../../catalog/domain/title.repository';
import { PROGRESS_REPOSITORY, type ProgressRepository } from '../../playback/domain/progress.repository';
import { PROFILE_REPOSITORY, type ProfileRepository } from '../../profiles/domain/profile.repository';
import { WATCHLIST_REPOSITORY, type WatchlistRepository } from '../../watchlist/domain/watchlist.repository';
import { RecommendationEngine } from '../domain/recommendation.engine';

/** Browse pages are cached per profile for this many seconds. */
const BROWSE_CACHE_TTL = 30;

/**
 * Assembles the personalised browse page in a single call.
 *
 * One request renders the entire page — billboard plus every row — which keeps
 * the client simple and makes the response trivially cacheable per profile.
 */
@Injectable()
export class BuildBrowsePageUseCase {
  private readonly engine = new RecommendationEngine();

  /**
   * @param titles - Catalog repository.
   * @param watchlist - Watchlist repository.
   * @param progress - Resume point repository.
   * @param profiles - Profile repository (parental controls).
   * @param cache - Cache port.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(WATCHLIST_REPOSITORY) private readonly watchlist: WatchlistRepository,
    @Inject(PROGRESS_REPOSITORY) private readonly progress: ProgressRepository,
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param profileId - Viewing profile the page is personalised for.
   * @param kind - Optional restriction used by the "Sorozatok"/"Filmek" pages.
   * @returns Billboard and rows, ready to render.
   * @throws {EntityNotFound} When the profile does not exist.
   */
  public async execute(profileId: string, kind?: 'MOVIE' | 'SERIES'): Promise<BrowsePageDto> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) {
      throw new EntityNotFound('Profil', profileId);
    }

    return this.cache.wrap(`browse:${profileId}:${kind ?? 'all'}`, BROWSE_CACHE_TTL, async () => {
      const now = this.clock.now();

      const [catalog, savedEntries, progressRecords] = await Promise.all([
        this.titles.list({ perPage: 200, kind, sort: 'popularity' }),
        this.watchlist.findByProfile(profileId),
        this.progress.findRecentByProfile(profileId, 20),
      ]);

      const savedTitles = await this.titles.findManyByIds(
        savedEntries.map((entry) => entry.titleId),
      );
      const watchedTitles = await this.titles.findManyByIds(
        progressRecords.map((record) => record.titleId),
      );

      const signals = this.engine.buildSignals(
        watchedTitles,
        savedTitles,
        profile.isKids ? MaturityRating.SEVEN_PLUS : profile.maturityLevel,
      );

      const ranked = this.engine.rank(catalog.items, signals, now, catalog.items.length);
      const scoreById = new Map(ranked.map((entry) => [entry.title.id, entry.score]));

      /**
       * Projects aggregates into row items, attaching the personalised score.
       *
       * @param titles - Aggregates to project.
       * @returns Row items.
       */
      const toItems = (titles: Title[]): TitleSummaryDto[] =>
        titles.map((title) => TitleMapper.toSummary(title, now, scoreById.get(title.id)));

      const allowed = ranked.map((entry) => entry.title);
      const rows: CatalogRowDto[] = [];

      if (progressRecords.length > 0) {
        const continueTitles = watchedTitles.filter((title) =>
          allowed.some((candidate) => candidate.id === title.id),
        );
        if (continueTitles.length > 0) {
          rows.push({
            id: 'continue-watching',
            title: 'Folytasd a nézést',
            layout: RowLayout.CONTINUE,
            reason: RecommendationReason.CONTINUE_WATCHING,
            items: toItems(continueTitles),
          });
        }
      }

      rows.push({
        id: 'trending',
        title: 'Népszerű most',
        layout: RowLayout.STANDARD,
        reason: RecommendationReason.TRENDING,
        items: toItems(
          [...allowed].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, MAX_ROW_ITEMS),
        ),
      });

      rows.push({
        id: 'top-ten',
        title: 'A mai Top 10 Magyarországon',
        layout: RowLayout.TOP_TEN,
        reason: RecommendationReason.TOP_TEN_LOCAL,
        items: toItems([...allowed].sort((a, b) => b.popularity - a.popularity).slice(0, 10)),
      });

      if (savedTitles.length > 0) {
        rows.push({
          id: 'my-list',
          title: 'A listám',
          layout: RowLayout.STANDARD,
          reason: RecommendationReason.MY_LIST,
          items: toItems(savedTitles),
        });
      }

      const topAffinity = [...signals.genreAffinity.entries()].sort((a, b) => b[1] - a[1]);
      for (const [genre] of topAffinity.slice(0, 2)) {
        const items = allowed.filter((title) => title.genres.includes(genre)).slice(0, MAX_ROW_ITEMS);
        if (items.length >= 4) {
          rows.push({
            id: `affinity-${genre}`,
            title: `Mert szereted: ${genre}`,
            layout: RowLayout.STANDARD,
            reason: RecommendationReason.GENRE_AFFINITY,
            items: toItems(items),
          });
        }
      }

      rows.push({
        id: 'new-releases',
        title: 'Újdonságok a NOVA-n',
        layout: RowLayout.STANDARD,
        reason: RecommendationReason.NEW_RELEASE,
        items: toItems(
          [...allowed]
            .sort(
              (a, b) => b.snapshot().publishedAt.getTime() - a.snapshot().publishedAt.getTime(),
            )
            .slice(0, MAX_ROW_ITEMS),
        ),
      });

      rows.push({
        id: 'originals',
        title: 'Csak a NOVA-n',
        layout: RowLayout.STANDARD,
        reason: RecommendationReason.TRENDING,
        items: toItems(allowed.filter((title) => title.snapshot().isOriginal).slice(0, MAX_ROW_ITEMS)),
      });

      // Genre rows fill the long tail of the page.
      const genreRows = new Map<string, Title[]>();
      for (const title of allowed) {
        for (const genre of title.genres) {
          genreRows.set(genre, [...(genreRows.get(genre) ?? []), title]);
        }
      }
      for (const [genre, titles] of [...genreRows.entries()].sort(
        (a, b) => b[1].length - a[1].length,
      )) {
        if (rows.length >= 12) {
          break;
        }
        if (titles.length >= 5 && !rows.some((row) => row.id === `affinity-${genre}`)) {
          rows.push({
            id: `genre-${genre}`,
            title: genre,
            layout: RowLayout.STANDARD,
            reason: RecommendationReason.GENRE_AFFINITY,
            items: toItems(titles.slice(0, MAX_ROW_ITEMS)),
          });
        }
      }

      const billboardTitle = ranked[0]?.title ?? allowed[0];
      if (!billboardTitle) {
        throw new EntityNotFound('Tartalom', 'billboard');
      }

      return {
        billboard: {
          title: TitleMapper.toSummary(billboardTitle, now, scoreById.get(billboardTitle.id)),
          synopsis: billboardTitle.snapshot().synopsis,
          inMyList: signals.watchlistTitleIds.has(billboardTitle.id),
        },
        rows: rows.filter((row) => row.items.length > 0),
      };
    });
  }
}
