import { Injectable } from '@nestjs/common';
import { MaturityRating } from '@nova/shared';

import { Profile } from '../domain/profile.entity';
import type { ProfileRepository } from '../domain/profile.repository';

/**
 * In-process profile repository.
 *
 * Seeds the demo account with three profiles (adult, second adult, kids) so the
 * profile gate, parental controls and personalised rows are all demonstrable
 * without a database.
 */
@Injectable()
export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, Profile>();

  public constructor() {
    this.seedDemoProfiles();
  }

  /** @inheritdoc */
  public async findByUser(userId: string): Promise<Profile[]> {
    return [...this.profiles.values()]
      .filter((profile) => profile.userId === userId)
      .sort((a, b) => a.snapshot().createdAt.getTime() - b.snapshot().createdAt.getTime());
  }

  /** @inheritdoc */
  public async findById(id: string): Promise<Profile | null> {
    return this.profiles.get(id) ?? null;
  }

  /** @inheritdoc */
  public async save(profile: Profile): Promise<void> {
    this.profiles.set(profile.id, profile);
  }

  /** @inheritdoc */
  public async delete(id: string): Promise<void> {
    this.profiles.delete(id);
  }

  /** @inheritdoc */
  public async countByUser(userId: string): Promise<number> {
    return [...this.profiles.values()].filter((profile) => profile.userId === userId).length;
  }

  /** Creates the demo profiles of the seeded demo account. */
  private seedDemoParams(): Array<{
    id: string;
    userId: string;
    name: string;
    avatarKey: string;
    isKids: boolean;
    maturityLevel: MaturityRating;
  }> {
    const demoUserId = '11111111-1111-4111-8111-111111111111';
    const adminUserId = '22222222-2222-4222-8222-222222222222';

    return [
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000001',
        userId: demoUserId,
        name: 'Anna',
        avatarKey: 'ember',
        isKids: false,
        maturityLevel: MaturityRating.EIGHTEEN_PLUS,
      },
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000002',
        userId: demoUserId,
        name: 'Bence',
        avatarKey: 'lagoon',
        isKids: false,
        maturityLevel: MaturityRating.SIXTEEN_PLUS,
      },
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000003',
        userId: demoUserId,
        name: 'Lili',
        avatarKey: 'citrus',
        isKids: true,
        maturityLevel: MaturityRating.SEVEN_PLUS,
      },
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000004',
        userId: adminUserId,
        name: 'Admin',
        avatarKey: 'cosmos',
        isKids: false,
        maturityLevel: MaturityRating.EIGHTEEN_PLUS,
      },
    ];
  }

  /** Materialises the demo profiles into the store. */
  private seedDemoProfiles(): void {
    const base = new Date('2026-01-08T10:00:00.000Z');

    this.seedDemoParams().forEach((params, index) => {
      const profile = Profile.rehydrate({
        id: params.id,
        userId: params.userId,
        name: params.name,
        avatarKey: params.avatarKey,
        isKids: params.isKids,
        language: 'hu',
        maturityLevel: params.maturityLevel,
        autoplayNextEpisode: true,
        autoplayPreviews: !params.isKids,
        pinHash: null,
        createdAt: new Date(base.getTime() + index * 1000),
        updatedAt: new Date(base.getTime() + index * 1000),
      });
      this.profiles.set(profile.id, profile);
    });
  }
}
