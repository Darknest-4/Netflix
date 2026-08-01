import { Inject, Injectable } from '@nestjs/common';
import type { TitleSummaryDto } from '@nova/shared';

import { CLOCK_PORT, type ClockPort } from '../../../common/application/ports';
import { EntityNotFound } from '../../../common/domain/domain.exceptions';
import { TitleMapper } from '../../catalog/application/title.mapper';
import { TITLE_REPOSITORY, type TitleRepository } from '../../catalog/domain/title.repository';
import { WATCHLIST_REPOSITORY, type WatchlistRepository } from '../domain/watchlist.repository';

/** Lists the titles a profile saved for later. */
@Injectable()
export class ListWatchlistUseCase {
  /**
   * @param watchlist - Watchlist repository.
   * @param titles - Catalog repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(WATCHLIST_REPOSITORY) private readonly watchlist: WatchlistRepository,
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param profileId - Viewing profile.
   * @returns Saved titles, most recently added first.
   */
  public async execute(profileId: string): Promise<TitleSummaryDto[]> {
    const entries = await this.watchlist.findByProfile(profileId);
    const titles = await this.titles.findManyByIds(entries.map((entry) => entry.titleId));
    const now = this.clock.now();

    // Preserve the "most recently added first" order of the watchlist.
    const byId = new Map(titles.map((title) => [title.id, title]));
    return entries
      .map((entry) => byId.get(entry.titleId))
      .filter((title): title is NonNullable<typeof title> => title !== undefined)
      .map((title) => TitleMapper.toSummary(title, now));
  }
}

/** Adds or removes a title, returning the resulting membership state. */
@Injectable()
export class ToggleWatchlistUseCase {
  /**
   * @param watchlist - Watchlist repository.
   * @param titles - Catalog repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(WATCHLIST_REPOSITORY) private readonly watchlist: WatchlistRepository,
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry to toggle.
   * @returns Whether the title is on the list after the operation.
   * @throws {EntityNotFound} When the title does not exist.
   */
  public async execute(profileId: string, titleId: string): Promise<{ inMyList: boolean }> {
    const title = await this.titles.findById(titleId);
    if (!title) {
      throw new EntityNotFound('Tartalom', titleId);
    }

    if (await this.watchlist.exists(profileId, titleId)) {
      await this.watchlist.remove(profileId, titleId);
      return { inMyList: false };
    }

    await this.watchlist.add({ profileId, titleId, createdAt: this.clock.now() });
    return { inMyList: true };
  }
}
