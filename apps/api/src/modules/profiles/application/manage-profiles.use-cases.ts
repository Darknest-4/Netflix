import { Inject, Injectable } from '@nestjs/common';
import {
  AVATAR_PRESETS,
  MAX_PROFILES_PER_ACCOUNT,
  type MaturityRating,
  type ProfileDto,
} from '@nova/shared';

import {
  CLOCK_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type IdGeneratorPort,
} from '../../../common/application/ports';
import {
  AccessDenied,
  BusinessRuleViolation,
  EntityNotFound,
} from '../../../common/domain/domain.exceptions';
import { Profile } from '../domain/profile.entity';
import { PROFILE_REPOSITORY, type ProfileRepository } from '../domain/profile.repository';

/**
 * Maps the aggregate onto its API representation.
 *
 * @param profile - Aggregate to expose.
 * @returns Wire-safe DTO (the PIN hash is reduced to a boolean flag).
 */
export function toProfileDto(profile: Profile): ProfileDto {
  const snapshot = profile.snapshot();
  return {
    id: snapshot.id,
    userId: snapshot.userId,
    name: snapshot.name,
    avatarKey: snapshot.avatarKey,
    isKids: snapshot.isKids,
    language: snapshot.language,
    maturityLevel: snapshot.maturityLevel,
    autoplayNextEpisode: snapshot.autoplayNextEpisode,
    autoplayPreviews: snapshot.autoplayPreviews,
    hasPin: snapshot.pinHash !== null,
    createdAt: snapshot.createdAt.toISOString(),
  };
}

/** Lists every profile of the signed-in account. */
@Injectable()
export class ListProfilesUseCase {
  /**
   * @param profiles - Profile repository.
   */
  public constructor(@Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository) {}

  /**
   * @param userId - Owning account.
   * @returns Profiles ordered by creation date.
   */
  public async execute(userId: string): Promise<ProfileDto[]> {
    const profiles = await this.profiles.findByUser(userId);
    return profiles.map(toProfileDto);
  }
}

/** Creates a profile, honouring the per-account limit. */
@Injectable()
export class CreateProfileUseCase {
  /**
   * @param profiles - Profile repository.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param userId - Owning account.
   * @param input - Profile settings coming from the create form.
   * @returns The created profile.
   * @throws {BusinessRuleViolation} When the account reached the profile limit.
   */
  public async execute(
    userId: string,
    input: {
      name: string;
      avatarKey?: string;
      isKids?: boolean;
      language?: string;
      maturityLevel?: MaturityRating;
    },
  ): Promise<ProfileDto> {
    const existing = await this.profiles.countByUser(userId);
    if (existing >= MAX_PROFILES_PER_ACCOUNT) {
      throw new BusinessRuleViolation(
        `Fiókonként legfeljebb ${MAX_PROFILES_PER_ACCOUNT} profil hozható létre.`,
      );
    }

    const profile = Profile.create({
      id: this.ids.generate(),
      userId,
      name: input.name,
      avatarKey: input.avatarKey ?? AVATAR_PRESETS[existing % AVATAR_PRESETS.length]!,
      isKids: input.isKids ?? false,
      language: input.language,
      maturityLevel: input.maturityLevel,
      now: this.clock.now(),
    });

    await this.profiles.save(profile);
    return toProfileDto(profile);
  }
}

/** Updates a profile owned by the caller. */
@Injectable()
export class UpdateProfileUseCase {
  /**
   * @param profiles - Profile repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param userId - Caller, used for the ownership check.
   * @param profileId - Profile to update.
   * @param changes - Fields to change.
   * @returns The updated profile.
   * @throws {EntityNotFound} When the profile does not exist.
   * @throws {AccessDenied} When the profile belongs to another account.
   */
  public async execute(
    userId: string,
    profileId: string,
    changes: {
      name?: string;
      avatarKey?: string;
      language?: string;
      maturityLevel?: MaturityRating;
      autoplayNextEpisode?: boolean;
      autoplayPreviews?: boolean;
    },
  ): Promise<ProfileDto> {
    const profile = await this.loadOwned(userId, profileId);
    profile.update(changes, this.clock.now());
    await this.profiles.save(profile);
    return toProfileDto(profile);
  }

  /**
   * Loads a profile and verifies ownership.
   *
   * @param userId - Caller.
   * @param profileId - Profile identifier.
   * @returns The owned aggregate.
   */
  private async loadOwned(userId: string, profileId: string): Promise<Profile> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) {
      throw new EntityNotFound('Profil', profileId);
    }
    if (profile.userId !== userId) {
      throw new AccessDenied('Ez a profil nem ehhez a fiókhoz tartozik.');
    }
    return profile;
  }
}

/** Deletes a profile, keeping at least one on the account. */
@Injectable()
export class DeleteProfileUseCase {
  /**
   * @param profiles - Profile repository.
   */
  public constructor(@Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository) {}

  /**
   * @param userId - Caller, used for the ownership check.
   * @param profileId - Profile to delete.
   * @throws {BusinessRuleViolation} When it is the last remaining profile.
   */
  public async execute(userId: string, profileId: string): Promise<void> {
    const profile = await this.profiles.findById(profileId);
    if (!profile) {
      throw new EntityNotFound('Profil', profileId);
    }
    if (profile.userId !== userId) {
      throw new AccessDenied('Ez a profil nem ehhez a fiókhoz tartozik.');
    }

    const remaining = await this.profiles.countByUser(userId);
    if (remaining <= 1) {
      throw new BusinessRuleViolation('Legalább egy profilnak maradnia kell a fiókon.');
    }

    await this.profiles.delete(profileId);
  }
}
