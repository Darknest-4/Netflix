import { Injectable } from '@nestjs/common';
import type { Episode, Prisma, Season, Title as PrismaTitle } from '@prisma/client';
import type { MaturityRating, TitleKind } from '@nova/shared';
import { MATURITY_WEIGHT } from '@nova/shared';

import { PrismaService } from '../../../common/infrastructure/persistence/prisma.service';
import { Title } from '../domain/title.entity';
import type { TitleQuery, TitleRepository } from '../domain/title.repository';

/** Row shape returned by the queries below (title with its full episode tree). */
type TitleRow = PrismaTitle & { seasons: (Season & { episodes: Episode[] })[] };

/** PostgreSQL backed catalog repository. */
@Injectable()
export class PrismaTitleRepository implements TitleRepository {
  /** Eager loading of the aggregate — a title is never half-loaded. */
  private readonly include = {
    seasons: { include: { episodes: { orderBy: { episodeNumber: 'asc' as const } } }, orderBy: { seasonNumber: 'asc' as const } },
  };

  /**
   * @param prisma - Connection handle.
   */
  public constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  public async findById(id: string): Promise<Title | null> {
    const row = await this.prisma.title.findUnique({ where: { id }, include: this.include });
    return row ? PrismaTitleRepository.toDomain(row) : null;
  }

  /** @inheritdoc */
  public async findBySlug(slug: string): Promise<Title | null> {
    const row = await this.prisma.title.findUnique({ where: { slug }, include: this.include });
    return row ? PrismaTitleRepository.toDomain(row) : null;
  }

  /** @inheritdoc */
  public async findManyByIds(ids: string[]): Promise<Title[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.title.findMany({
      where: { id: { in: ids } },
      include: this.include,
    });
    return rows.map(PrismaTitleRepository.toDomain);
  }

  /** @inheritdoc */
  public async list(query: TitleQuery): Promise<{ items: Title[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(100, Math.max(1, query.perPage ?? 24));
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.title.findMany({
        where,
        include: this.include,
        orderBy: PrismaTitleRepository.buildOrderBy(query.sort ?? 'popularity'),
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.title.count({ where }),
    ]);

    return { items: rows.map(PrismaTitleRepository.toDomain), total };
  }

  /** @inheritdoc */
  public async save(title: Title): Promise<void> {
    const snapshot = title.snapshot();
    const scalars = {
      slug: snapshot.slug,
      name: snapshot.name,
      kind: snapshot.kind,
      tagline: snapshot.tagline,
      synopsis: snapshot.synopsis,
      releaseYear: snapshot.releaseYear,
      maturityRating: snapshot.maturityRating,
      durationSeconds: snapshot.durationSeconds,
      genres: snapshot.genres,
      moods: snapshot.moods,
      cast: snapshot.cast,
      directors: snapshot.directors,
      writers: snapshot.writers,
      country: snapshot.country,
      languages: snapshot.languages,
      subtitleLanguages: snapshot.subtitleLanguages,
      audioLanguages: snapshot.audioLanguages,
      isOriginal: snapshot.isOriginal,
      isPublished: snapshot.isPublished,
      popularity: snapshot.popularity,
      trendingScore: snapshot.trendingScore,
      trailerAssetKey: snapshot.trailerAssetKey,
      assetKey: snapshot.assetKey,
      publishedAt: snapshot.publishedAt,
    };

    // The aggregate is written as a whole: seasons and episodes are replaced in
    // the same transaction, so a title can never be persisted half-updated.
    await this.prisma.$transaction(async (tx) => {
      await tx.title.upsert({
        where: { id: snapshot.id },
        create: { id: snapshot.id, ...scalars },
        update: scalars,
      });

      await tx.season.deleteMany({ where: { titleId: snapshot.id } });

      for (const season of snapshot.seasons) {
        await tx.season.create({
          data: {
            id: season.id,
            titleId: snapshot.id,
            seasonNumber: season.seasonNumber,
            name: season.name,
            episodes: {
              create: season.episodes.map((episode) => ({
                id: episode.id,
                titleId: snapshot.id,
                episodeNumber: episode.episodeNumber,
                name: episode.name,
                synopsis: episode.synopsis,
                durationSeconds: episode.durationSeconds,
                assetKey: episode.assetKey,
              })),
            },
          },
        });
      }
    });
  }

  /** @inheritdoc */
  public async delete(id: string): Promise<void> {
    await this.prisma.title.delete({ where: { id } });
  }

  /** @inheritdoc */
  public async count(): Promise<number> {
    return this.prisma.title.count();
  }

  /** @inheritdoc */
  public async topByPopularity(limit: number): Promise<Title[]> {
    const rows = await this.prisma.title.findMany({
      where: { isPublished: true },
      include: this.include,
      orderBy: { popularity: 'desc' },
      take: limit,
    });
    return rows.map(PrismaTitleRepository.toDomain);
  }

  /**
   * Translates the domain query into a Prisma `where` clause.
   *
   * @param query - Domain level filters.
   * @returns Prisma filter object.
   */
  private buildWhere(query: TitleQuery): Prisma.TitleWhereInput {
    const where: Prisma.TitleWhereInput = {};

    if (!query.includeUnpublished) {
      where.isPublished = true;
    }
    if (query.kind) {
      where.kind = query.kind;
    }
    if (query.genre) {
      where.genres = { has: query.genre };
    }
    if (query.mood) {
      where.moods = { has: query.mood };
    }
    if (query.onlyOriginals) {
      where.isOriginal = true;
    }
    if (query.maxMaturityWeight !== undefined) {
      const allowed = (Object.keys(MATURITY_WEIGHT) as MaturityRating[]).filter(
        (rating) => MATURITY_WEIGHT[rating] <= (query.maxMaturityWeight as number),
      );
      where.maturityRating = { in: allowed };
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { synopsis: { contains: query.search, mode: 'insensitive' } },
        { genres: { has: query.search } },
        { cast: { has: query.search } },
      ];
    }

    return where;
  }

  /**
   * Translates the domain sort key into a Prisma `orderBy` clause.
   *
   * @param sort - Requested ordering.
   * @returns Prisma ordering object.
   */
  private static buildOrderBy(
    sort: NonNullable<TitleQuery['sort']>,
  ): Prisma.TitleOrderByWithRelationInput {
    switch (sort) {
      case 'newest':
        return { publishedAt: 'desc' };
      case 'trending':
        return { trendingScore: 'desc' };
      case 'name':
        return { name: 'asc' };
      case 'popularity':
      default:
        return { popularity: 'desc' };
    }
  }

  /**
   * Maps a database row tree onto the domain aggregate.
   *
   * @param row - Prisma record including seasons and episodes.
   * @returns Rehydrated aggregate.
   */
  private static toDomain(row: TitleRow): Title {
    return Title.rehydrate({
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind as TitleKind,
      tagline: row.tagline,
      synopsis: row.synopsis,
      releaseYear: row.releaseYear,
      maturityRating: row.maturityRating as MaturityRating,
      durationSeconds: row.durationSeconds,
      genres: row.genres,
      moods: row.moods,
      cast: row.cast,
      directors: row.directors,
      writers: row.writers,
      country: row.country,
      languages: row.languages,
      subtitleLanguages: row.subtitleLanguages,
      audioLanguages: row.audioLanguages,
      isOriginal: row.isOriginal,
      isPublished: row.isPublished,
      popularity: row.popularity,
      trendingScore: row.trendingScore,
      trailerAssetKey: row.trailerAssetKey,
      assetKey: row.assetKey,
      publishedAt: row.publishedAt,
      seasons: row.seasons.map((season) => ({
        id: season.id,
        seasonNumber: season.seasonNumber,
        name: season.name,
        episodes: season.episodes.map((episode) => ({
          id: episode.id,
          seasonNumber: season.seasonNumber,
          episodeNumber: episode.episodeNumber,
          name: episode.name,
          synopsis: episode.synopsis,
          durationSeconds: episode.durationSeconds,
          assetKey: episode.assetKey,
        })),
      })),
    });
  }
}
