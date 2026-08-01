import type { Profile } from './profile.entity';

/** Outbound port of the profile aggregate. */
export interface ProfileRepository {
  /**
   * @param userId - Owning account.
   * @returns Every profile of the account, oldest first.
   */
  findByUser(userId: string): Promise<Profile[]>;

  /**
   * @param id - Profile identifier.
   * @returns The aggregate, or `null`.
   */
  findById(id: string): Promise<Profile | null>;

  /**
   * Inserts or updates a profile.
   *
   * @param profile - Aggregate to persist.
   */
  save(profile: Profile): Promise<void>;

  /**
   * Deletes a profile and everything attached to it.
   *
   * @param id - Profile identifier.
   */
  delete(id: string): Promise<void>;

  /**
   * @param userId - Owning account.
   * @returns Number of profiles the account already owns.
   */
  countByUser(userId: string): Promise<number>;
}

/** Injection token of {@link ProfileRepository}. */
export const PROFILE_REPOSITORY = Symbol('ProfileRepository');
