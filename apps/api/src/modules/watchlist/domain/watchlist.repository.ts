/** A single "my list" entry. */
export interface WatchlistEntry {
  profileId: string;
  titleId: string;
  createdAt: Date;
}

/** Outbound port of the watchlist context. */
export interface WatchlistRepository {
  /**
   * @param profileId - Viewing profile.
   * @returns Entries, most recently added first.
   */
  findByProfile(profileId: string): Promise<WatchlistEntry[]>;

  /**
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry.
   * @returns True when the title is already on the list.
   */
  exists(profileId: string, titleId: string): Promise<boolean>;

  /**
   * Adds a title to the list (idempotent).
   *
   * @param entry - Entry to store.
   */
  add(entry: WatchlistEntry): Promise<void>;

  /**
   * Removes a title from the list (idempotent).
   *
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry.
   */
  remove(profileId: string, titleId: string): Promise<void>;
}

/** Injection token of {@link WatchlistRepository}. */
export const WATCHLIST_REPOSITORY = Symbol('WatchlistRepository');
