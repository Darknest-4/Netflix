import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/infrastructure/persistence/prisma.service';
import type { WatchlistEntry, WatchlistRepository } from '../domain/watchlist.repository';

/**
 * In-process watchlist storage.
 *
 * Pre-populates the demo profile so the "Saját lista" row is not empty on a
 * fresh install.
 */
@Injectable()
export class InMemoryWatchlistRepository implements WatchlistRepository {
  private readonly entries: WatchlistEntry[] = [
    {
      profileId: 'aaaaaaaa-0000-4000-8000-000000000001',
      titleId: 't-001-eszaki-feny',
      createdAt: new Date('2026-07-20T18:00:00.000Z'),
    },
    {
      profileId: 'aaaaaaaa-0000-4000-8000-000000000001',
      titleId: 't-010-csillagkovacsok',
      createdAt: new Date('2026-07-24T20:30:00.000Z'),
    },
    {
      profileId: 'aaaaaaaa-0000-4000-8000-000000000001',
      titleId: 't-022-fekete-doboz',
      createdAt: new Date('2026-07-29T21:10:00.000Z'),
    },
  ];

  /** @inheritdoc */
  public async findByProfile(profileId: string): Promise<WatchlistEntry[]> {
    return this.entries
      .filter((entry) => entry.profileId === profileId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /** @inheritdoc */
  public async exists(profileId: string, titleId: string): Promise<boolean> {
    return this.entries.some(
      (entry) => entry.profileId === profileId && entry.titleId === titleId,
    );
  }

  /** @inheritdoc */
  public async add(entry: WatchlistEntry): Promise<void> {
    if (!(await this.exists(entry.profileId, entry.titleId))) {
      this.entries.push(entry);
    }
  }

  /** @inheritdoc */
  public async remove(profileId: string, titleId: string): Promise<void> {
    const index = this.entries.findIndex(
      (entry) => entry.profileId === profileId && entry.titleId === titleId,
    );
    if (index >= 0) {
      this.entries.splice(index, 1);
    }
  }
}

/** PostgreSQL backed watchlist storage. */
@Injectable()
export class PrismaWatchlistRepository implements WatchlistRepository {
  /**
   * @param prisma - Connection handle.
   */
  public constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  public async findByProfile(profileId: string): Promise<WatchlistEntry[]> {
    const rows = await this.prisma.watchlistItem.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      profileId: row.profileId,
      titleId: row.titleId,
      createdAt: row.createdAt,
    }));
  }

  /** @inheritdoc */
  public async exists(profileId: string, titleId: string): Promise<boolean> {
    const row = await this.prisma.watchlistItem.findUnique({
      where: { profileId_titleId: { profileId, titleId } },
    });
    return row !== null;
  }

  /** @inheritdoc */
  public async add(entry: WatchlistEntry): Promise<void> {
    await this.prisma.watchlistItem.upsert({
      where: { profileId_titleId: { profileId: entry.profileId, titleId: entry.titleId } },
      create: { profileId: entry.profileId, titleId: entry.titleId, createdAt: entry.createdAt },
      update: {},
    });
  }

  /** @inheritdoc */
  public async remove(profileId: string, titleId: string): Promise<void> {
    await this.prisma.watchlistItem
      .delete({ where: { profileId_titleId: { profileId, titleId } } })
      .catch(() => undefined);
  }
}
