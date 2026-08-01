/** Resume point of a profile for one movie or episode. */
export interface ProgressRecord {
  id: string;
  profileId: string;
  titleId: string;
  episodeId: string | null;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  updatedAt: Date;
}

/** Outbound port of the playback context. */
export interface ProgressRepository {
  /**
   * @param profileId - Viewing profile.
   * @param limit - Maximum number of rows.
   * @returns Most recently watched, unfinished items first.
   */
  findRecentByProfile(profileId: string, limit: number): Promise<ProgressRecord[]>;

  /**
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry.
   * @param episodeId - Episode, or `null` for movies.
   * @returns The stored resume point, or `null`.
   */
  find(profileId: string, titleId: string, episodeId: string | null): Promise<ProgressRecord | null>;

  /**
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry.
   * @returns The most recent resume point for any episode of the title.
   */
  findLatestForTitle(profileId: string, titleId: string): Promise<ProgressRecord | null>;

  /**
   * Inserts or updates a resume point.
   *
   * @param record - Progress to persist.
   */
  save(record: ProgressRecord): Promise<void>;

  /**
   * Removes an item from "Folytasd a nézést".
   *
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry.
   */
  removeForTitle(profileId: string, titleId: string): Promise<void>;

  /**
   * @returns Total watched hours across the platform (admin analytics).
   */
  totalWatchedHours(): Promise<number>;
}

/** Injection token of {@link ProgressRepository}. */
export const PROGRESS_REPOSITORY = Symbol('ProgressRepository');
