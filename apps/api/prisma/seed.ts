/**
 * Database seeding script.
 *
 * Loads the same editorial catalog the in-memory repository uses, plus the two
 * demo accounts, their profiles, watchlist entries and resume points — so a
 * fresh PostgreSQL instance behaves exactly like the zero-config demo mode.
 *
 * Run with `npm run db:seed --workspace @nova/api`.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { buildSeedCatalog } from '../src/modules/catalog/infrastructure/seed/catalog.seed';

const prisma = new PrismaClient();

/** Identifier of the seeded member account. */
const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111';

/** Identifier of the seeded administrator account. */
const ADMIN_USER_ID = '22222222-2222-4222-8222-222222222222';

/**
 * Inserts the demo accounts, their profiles and a trial subscription.
 */
async function seedAccounts(): Promise<void> {
  const now = new Date();

  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    create: {
      id: DEMO_USER_ID,
      email: 'demo@nova.example',
      displayName: 'Demo Néző',
      passwordHash: bcrypt.hashSync('NovaDemo2026!', 10),
      role: 'MEMBER',
      emailVerified: true,
      profiles: {
        create: [
          { id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Anna', avatarKey: 'ember' },
          {
            id: 'aaaaaaaa-0000-4000-8000-000000000002',
            name: 'Bence',
            avatarKey: 'lagoon',
            maturityLevel: 'SIXTEEN_PLUS',
          },
          {
            id: 'aaaaaaaa-0000-4000-8000-000000000003',
            name: 'Lili',
            avatarKey: 'citrus',
            isKids: true,
            maturityLevel: 'SEVEN_PLUS',
            autoplayPreviews: false,
          },
        ],
      },
      subscription: {
        create: {
          plan: 'PREMIUM',
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000),
        },
      },
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: ADMIN_USER_ID },
    create: {
      id: ADMIN_USER_ID,
      email: 'admin@nova.example',
      displayName: 'NOVA Admin',
      passwordHash: bcrypt.hashSync('NovaAdmin2026!', 10),
      role: 'ADMIN',
      emailVerified: true,
      profiles: {
        create: [{ id: 'aaaaaaaa-0000-4000-8000-000000000004', name: 'Admin', avatarKey: 'cosmos' }],
      },
      subscription: {
        create: {
          plan: 'PREMIUM',
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 86_400_000),
        },
      },
    },
    update: {},
  });
}

/**
 * Inserts every catalog entry with its seasons and episodes.
 */
async function seedCatalog(): Promise<void> {
  for (const title of buildSeedCatalog()) {
    await prisma.title.upsert({
      where: { id: title.id },
      update: {},
      create: {
        id: title.id,
        slug: title.slug,
        name: title.name,
        kind: title.kind,
        tagline: title.tagline,
        synopsis: title.synopsis,
        releaseYear: title.releaseYear,
        maturityRating: title.maturityRating,
        durationSeconds: title.durationSeconds,
        genres: title.genres,
        moods: title.moods,
        cast: title.cast,
        directors: title.directors,
        writers: title.writers,
        country: title.country,
        languages: title.languages,
        subtitleLanguages: title.subtitleLanguages,
        audioLanguages: title.audioLanguages,
        isOriginal: title.isOriginal,
        isPublished: title.isPublished,
        popularity: title.popularity,
        trendingScore: title.trendingScore,
        trailerAssetKey: title.trailerAssetKey,
        assetKey: title.assetKey,
        publishedAt: title.publishedAt,
        seasons: {
          create: title.seasons.map((season) => ({
            id: season.id,
            seasonNumber: season.seasonNumber,
            name: season.name,
            episodes: {
              create: season.episodes.map((episode) => ({
                id: episode.id,
                titleId: title.id,
                episodeNumber: episode.episodeNumber,
                name: episode.name,
                synopsis: episode.synopsis,
                durationSeconds: episode.durationSeconds,
                assetKey: episode.assetKey,
              })),
            },
          })),
        },
      },
    });
  }
}

/**
 * Adds watchlist entries and resume points so the personalised rows are
 * populated on a freshly seeded database.
 */
async function seedActivity(): Promise<void> {
  const profileId = 'aaaaaaaa-0000-4000-8000-000000000001';
  const catalog = buildSeedCatalog();
  const series = catalog.find((title) => title.seasons.length > 0);
  const movie = catalog.find((title) => title.assetKey !== null);

  if (series) {
    await prisma.watchlistItem.upsert({
      where: { profileId_titleId: { profileId, titleId: series.id } },
      create: { profileId, titleId: series.id },
      update: {},
    });

    const episode = series.seasons[0]?.episodes[2];
    if (episode) {
      const existing = await prisma.playbackProgress.findFirst({
        where: { profileId, titleId: series.id, episodeId: episode.id },
      });
      if (!existing) {
        await prisma.playbackProgress.create({
          data: {
            profileId,
            titleId: series.id,
            episodeId: episode.id,
            positionSeconds: Math.round(episode.durationSeconds * 0.42),
            durationSeconds: episode.durationSeconds,
          },
        });
      }
    }
  }

  if (movie) {
    const existing = await prisma.playbackProgress.findFirst({
      where: { profileId, titleId: movie.id, episodeId: null },
    });
    if (!existing) {
      await prisma.playbackProgress.create({
        data: {
          profileId,
          titleId: movie.id,
          episodeId: null,
          positionSeconds: Math.round((movie.durationSeconds ?? 6000) * 0.34),
          durationSeconds: movie.durationSeconds ?? 6000,
        },
      });
    }
  }
}

/**
 * Runs the whole seeding pipeline.
 */
async function main(): Promise<void> {
  console.info('NOVA adatbázis feltöltése…');
  await seedAccounts();
  await seedCatalog();
  await seedActivity();

  const [users, titles] = await Promise.all([prisma.user.count(), prisma.title.count()]);
  console.info(`Kész: ${users} felhasználó, ${titles} tartalom.`);
}

void main()
  .catch((error: unknown) => {
    console.error('A seed futtatása sikertelen:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
