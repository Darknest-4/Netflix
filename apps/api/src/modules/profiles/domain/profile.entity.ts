import { KIDS_MAX_MATURITY, MaturityRating, MATURITY_WEIGHT } from '@nova/shared';

import { Entity } from '../../../common/domain/entity.base';
import { BusinessRuleViolation } from '../../../common/domain/domain.exceptions';

/** Persistent state of the `Profile` aggregate. */
export interface ProfileProps {
  id: string;
  userId: string;
  name: string;
  avatarKey: string;
  isKids: boolean;
  language: string;
  maturityLevel: MaturityRating;
  autoplayNextEpisode: boolean;
  autoplayPreviews: boolean;
  pinHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Viewing profile aggregate.
 *
 * Enforces the parental control invariant: a kids profile can never be raised
 * above `KIDS_MAX_MATURITY`, no matter what the API caller sends.
 */
export class Profile extends Entity<ProfileProps> {
  /**
   * Rehydrates an aggregate from storage.
   *
   * @param props - Persisted state.
   * @returns The reconstructed aggregate.
   */
  public static rehydrate(props: ProfileProps): Profile {
    return new Profile(props);
  }

  /**
   * Creates a new viewing profile.
   *
   * @param input - Owner, display name and personalisation settings.
   * @returns The created aggregate.
   * @throws {BusinessRuleViolation} When the name is empty or too long.
   */
  public static create(input: {
    id: string;
    userId: string;
    name: string;
    avatarKey: string;
    isKids: boolean;
    language?: string;
    maturityLevel?: MaturityRating;
    now: Date;
  }): Profile {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 24) {
      throw new BusinessRuleViolation('A profilnév 1 és 24 karakter között lehet.');
    }

    const requested = input.maturityLevel ?? MaturityRating.EIGHTEEN_PLUS;

    return new Profile({
      id: input.id,
      userId: input.userId,
      name,
      avatarKey: input.avatarKey,
      isKids: input.isKids,
      language: input.language ?? 'hu',
      maturityLevel: input.isKids ? KIDS_MAX_MATURITY : requested,
      autoplayNextEpisode: true,
      autoplayPreviews: !input.isKids,
      pinHash: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  /** Owning account. */
  public get userId(): string {
    return this.props.userId;
  }

  /** Display name shown on the profile gate. */
  public get name(): string {
    return this.props.name;
  }

  /** True for child profiles (restricted catalog and simplified UI). */
  public get isKids(): boolean {
    return this.props.isKids;
  }

  /** Highest rating this profile may watch. */
  public get maturityLevel(): MaturityRating {
    return this.props.maturityLevel;
  }

  /** Hashed profile PIN, or `null` when the profile is unlocked. */
  public get pinHash(): string | null {
    return this.props.pinHash;
  }

  /**
   * Applies an update from the profile editor.
   *
   * @param changes - Fields to change; omitted fields stay untouched.
   * @param now - Current instant.
   * @throws {BusinessRuleViolation} When a kids profile is raised too high.
   */
  public update(
    changes: Partial<
      Pick<
        ProfileProps,
        | 'name'
        | 'avatarKey'
        | 'language'
        | 'maturityLevel'
        | 'autoplayNextEpisode'
        | 'autoplayPreviews'
      >
    >,
    now: Date,
  ): void {
    if (changes.name !== undefined) {
      const name = changes.name.trim();
      if (name.length < 1 || name.length > 24) {
        throw new BusinessRuleViolation('A profilnév 1 és 24 karakter között lehet.');
      }
      this.props.name = name;
    }

    if (changes.maturityLevel !== undefined) {
      const isTooHighForKids =
        this.props.isKids &&
        MATURITY_WEIGHT[changes.maturityLevel] > MATURITY_WEIGHT[KIDS_MAX_MATURITY];

      if (isTooHighForKids) {
        throw new BusinessRuleViolation('Gyermekprofil korhatára nem emelhető 7+ fölé.');
      }
      this.props.maturityLevel = changes.maturityLevel;
    }

    this.props.avatarKey = changes.avatarKey ?? this.props.avatarKey;
    this.props.language = changes.language ?? this.props.language;
    this.props.autoplayNextEpisode = changes.autoplayNextEpisode ?? this.props.autoplayNextEpisode;
    this.props.autoplayPreviews = changes.autoplayPreviews ?? this.props.autoplayPreviews;
    this.props.updatedAt = now;
  }

  /**
   * Sets or clears the profile lock.
   *
   * @param pinHash - Hashed PIN, or `null` to remove the lock.
   * @param now - Current instant.
   */
  public setPin(pinHash: string | null, now: Date): void {
    this.props.pinHash = pinHash;
    this.props.updatedAt = now;
  }
}
