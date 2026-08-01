import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/infrastructure/persistence/prisma.service';
import type { ProgressRecord, ProgressRepository } from '../domain/progress.repository';

/**
 * In-process resume points.
 *
 * Seeds three partially watched items for the demo profile so the "Folytasd a
 * nézést" row is populated on first launch.
 */
@Injectable()
export class InMemoryProgressRepository implements ProgressRepository {
  private readonly records: ProgressRecord[] = [
    {
      id: 'p-1',
      profileId: 'aaaaaaaa-0000-4000-8000-000000000001',
      titleId: 't-001-eszaki-feny',
      episodeId: 't-001-eszaki-feny-s1e3',
      positionSeconds: 1_180,
      durationSeconds: 2_760,
      completed: false,
      updatedAt: new Date('2026-07-31T21:12:00.000Z'),
    },
    {
      id: 'p-2',
      profileId: 'aaaaaaaa-0000-4000-8000-000000000001',
      titleId: 't-003-hetedik-hullam',
      episodeId: null,
      positionSeconds: 2_400,
      durationSeconds: 7_080,
      completed: false,
      updatedAt: new Date('2026-07-30T20:05:00.000Z'),
    },
    {
      id: 'p-3',
      profileId: 'aaaaaaaa-0000-4000-8000-000000000001',
      titleId: 't-008-ejfeli-konyha',
      episodeId: 't-008-ejfeli-konyha-s2e4',
      positionSeconds: 640,
      durationSeconds: 2_520,
      completed: false,
      updatedAt: new Date('2026-07-28T22:40:00.000Z'),
    },
  ];

  /** @inheritdoc */
  public async findRecentByProfile(profileId: string, limit: number): Promise<ProgressRecord[]> {
    return this.records
      .filter((record) => record.profileId === profileId && !record.completed)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  /** @inheritdoc */
  public async find(
    profileId: string,
    titleId: string,
    episodeId: string | null,
  ): Promise<ProgressRecord | null> {
    return (
      this.records.find(
        (record) =>
          record.profileId === profileId &&
          record.titleId === titleId &&
          record.episodeId === episodeId,
      ) ?? null
    );
  }

  /** @inheritdoc */
  public async findLatestForTitle(
    profileId: string,
    titleId: string,
  ): Promise<ProgressRecord | null> {
    return (
      this.records
        .filter((record) => record.profileId === profileId && record.titleId === titleId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null
    );
  }

  /** @inheritdoc */
  public async save(record: ProgressRecord): Promise<void> {
    const index = this.records.findIndex(
      (candidate) =>
        candidate.profileId === record.profileId &&
        candidate.titleId === record.titleId &&
        candidate.episodeId === record.episodeId,
    );

    if (index >= 0) {
      this.records[index] = record;
    } else {
      this.records.push(record);
    }
  }

  /** @inheritdoc */
  public async removeForTitle(profileId: string, titleId: string): Promise<void> {
    for (let index = this.records.length - 1; index >= 0; index -= 1) {
      const record = this.records[index] as ProgressRecord;
      if (record.profileId === profileId && record.titleId === titleId) {
        this.records.splice(index, 1);
      }
    }
  }

  /** @inheritdoc */
  public async totalWatchedHours(): Promise<number> {
    const seconds = this.records.reduce((sum, record) => sum + record.positionSeconds, 0);
    return Math.round(seconds / 360) / 10;
  }
}

/** PostgreSQL backed resume points. */
@Injectable()
export class PrismaProgressRepository implements ProgressRepository {
  /**
   * @param prisma - Connection handle.
   */
  public constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  public async findRecentByProfile(profileId: string, limit: number): Promise<ProgressRecord[]> {
    const rows = await this.prisma.playbackProgress.findMany({
      where: { profileId, completed: false },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return rows.map(PrismaProgressRepository.toRecord);
  }

  /** @inheritdoc */
  public async find(
    profileId: string,
    titleId: string,
    episodeId: string | null,
  ): Promise<ProgressRecord | null> {
    const row = await this.prisma.playbackProgress.findFirst({
      where: { profileId, titleId, episodeId },
    });
    return row ? PrismaProgressRepository.toRecord(row) : null;
  }

  /** @inheritdoc */
  public async findLatestForTitle(
    profileId: string,
    titleId: string,
  ): Promise<ProgressRecord | null> {
    const row = await this.prisma.playbackProgress.findFirst({
      where: { profileId, titleId },
      orderBy: { updatedAt: 'desc' },
    });
    return row ? PrismaProgressRepository.toRecord(row) : null;
  }

  /** @inheritdoc */
  public async save(record: ProgressRecord): Promise<void> {
    // `episodeId` is nullable, so the compound unique key cannot be used in an
    // upsert: look the row up first, then insert or update it.
    const existing = await this.prisma.playbackProgress.findFirst({
      where: {
        profileId: record.profileId,
        titleId: record.titleId,
        episodeId: record.episodeId,
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.playbackProgress.update({
        where: { id: existing.id },
        data: {
          positionSeconds: record.positionSeconds,
          durationSeconds: record.durationSeconds,
          completed: record.completed,
        },
      });
      return;
    }

    await this.prisma.playbackProgress.create({
      data: {
        id: record.id,
        profileId: record.profileId,
        titleId: record.titleId,
        episodeId: record.episodeId,
        positionSeconds: record.positionSeconds,
        durationSeconds: record.durationSeconds,
        completed: record.completed,
      },
    });
  }

  /** @inheritdoc */
  public async removeForTitle(profileId: string, titleId: string): Promise<void> {
    await this.prisma.playbackProgress.deleteMany({ where: { profileId, titleId } });
  }

  /** @inheritdoc */
  public async totalWatchedHours(): Promise<number> {
    const aggregate = await this.prisma.playbackProgress.aggregate({
      _sum: { positionSeconds: true },
    });
    return Math.round((aggregate._sum.positionSeconds ?? 0) / 360) / 10;
  }

  /**
   * Maps a database row onto the port's record shape.
   *
   * @param row - Prisma record.
   * @returns Progress record.
   */
  private static toRecord(row: {
    id: string;
    profileId: string;
    titleId: string;
    episodeId: string | null;
    positionSeconds: number;
    durationSeconds: number;
    completed: boolean;
    updatedAt: Date;
  }): ProgressRecord {
    return {
      id: row.id,
      profileId: row.profileId,
      titleId: row.titleId,
      episodeId: row.episodeId,
      positionSeconds: row.positionSeconds,
      durationSeconds: row.durationSeconds,
      completed: row.completed,
      updatedAt: row.updatedAt,
    };
  }
}
