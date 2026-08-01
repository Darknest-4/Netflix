import { Injectable } from '@nestjs/common';
import type { Profile as PrismaProfile } from '@prisma/client';
import type { MaturityRating } from '@nova/shared';

import { PrismaService } from '../../../common/infrastructure/persistence/prisma.service';
import { Profile } from '../domain/profile.entity';
import type { ProfileRepository } from '../domain/profile.repository';

/** PostgreSQL backed profile repository. */
@Injectable()
export class PrismaProfileRepository implements ProfileRepository {
  /**
   * @param prisma - Connection handle.
   */
  public constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  public async findByUser(userId: string): Promise<Profile[]> {
    const rows = await this.prisma.profile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(PrismaProfileRepository.toDomain);
  }

  /** @inheritdoc */
  public async findById(id: string): Promise<Profile | null> {
    const row = await this.prisma.profile.findUnique({ where: { id } });
    return row ? PrismaProfileRepository.toDomain(row) : null;
  }

  /** @inheritdoc */
  public async save(profile: Profile): Promise<void> {
    const snapshot = profile.snapshot();
    await this.prisma.profile.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        userId: snapshot.userId,
        name: snapshot.name,
        avatarKey: snapshot.avatarKey,
        isKids: snapshot.isKids,
        language: snapshot.language,
        maturityLevel: snapshot.maturityLevel,
        autoplayNextEpisode: snapshot.autoplayNextEpisode,
        autoplayPreviews: snapshot.autoplayPreviews,
        pinHash: snapshot.pinHash,
        createdAt: snapshot.createdAt,
      },
      update: {
        name: snapshot.name,
        avatarKey: snapshot.avatarKey,
        isKids: snapshot.isKids,
        language: snapshot.language,
        maturityLevel: snapshot.maturityLevel,
        autoplayNextEpisode: snapshot.autoplayNextEpisode,
        autoplayPreviews: snapshot.autoplayPreviews,
        pinHash: snapshot.pinHash,
      },
    });
  }

  /** @inheritdoc */
  public async delete(id: string): Promise<void> {
    await this.prisma.profile.delete({ where: { id } });
  }

  /** @inheritdoc */
  public async countByUser(userId: string): Promise<number> {
    return this.prisma.profile.count({ where: { userId } });
  }

  /**
   * Maps a database row onto the domain aggregate.
   *
   * @param row - Prisma record.
   * @returns Rehydrated aggregate.
   */
  private static toDomain(row: PrismaProfile): Profile {
    return Profile.rehydrate({
      id: row.id,
      userId: row.userId,
      name: row.name,
      avatarKey: row.avatarKey,
      isKids: row.isKids,
      language: row.language,
      maturityLevel: row.maturityLevel as MaturityRating,
      autoplayNextEpisode: row.autoplayNextEpisode,
      autoplayPreviews: row.autoplayPreviews,
      pinHash: row.pinHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
