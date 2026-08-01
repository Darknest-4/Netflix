import { MaturityRating, TitleKind } from '@nova/shared';

import { Title, type TitleProps } from '../../catalog/domain/title.entity';
import { RecommendationEngine } from './recommendation.engine';

/** Fixed instant so the "new release" bonus is deterministic. */
const NOW = new Date('2026-06-01T00:00:00.000Z');

/**
 * Builds a catalog aggregate for the tests.
 *
 * @param overrides - Fields to override.
 * @returns A rehydrated `Title`.
 */
function makeTitle(overrides: Partial<TitleProps> = {}): Title {
  return Title.rehydrate({
    id: 'title-1',
    slug: 'title-1',
    name: 'Teszt cím',
    kind: TitleKind.MOVIE,
    tagline: '',
    synopsis: '',
    releaseYear: 2025,
    maturityRating: MaturityRating.TWELVE_PLUS,
    durationSeconds: 6000,
    genres: ['Dráma'],
    moods: ['Feszült'],
    cast: [],
    directors: [],
    writers: [],
    country: 'HU',
    languages: ['hu'],
    subtitleLanguages: ['hu'],
    audioLanguages: ['hu'],
    isOriginal: false,
    isPublished: true,
    popularity: 50,
    trendingScore: 0,
    trailerAssetKey: '',
    assetKey: 'asset.m3u8',
    publishedAt: new Date('2025-01-01T00:00:00.000Z'),
    seasons: [],
    ...overrides,
  });
}

describe('RecommendationEngine', () => {
  const engine = new RecommendationEngine();

  /** Signals of a profile with no history. */
  const emptySignals = engine.buildSignals([], [], MaturityRating.EIGHTEEN_PLUS);

  describe('buildSignals', () => {
    it('weighs watched titles higher than saved ones', () => {
      const watched = makeTitle({ id: 'a', genres: ['Sci-Fi'] });
      const saved = makeTitle({ id: 'b', genres: ['Vígjáték'] });

      const signals = engine.buildSignals([watched], [saved], MaturityRating.EIGHTEEN_PLUS);

      expect(signals.genreAffinity.get('Sci-Fi')).toBe(2);
      expect(signals.genreAffinity.get('Vígjáték')).toBe(1);
    });

    it('collects the watched and saved id sets', () => {
      const signals = engine.buildSignals(
        [makeTitle({ id: 'watched' })],
        [makeTitle({ id: 'saved' })],
        MaturityRating.EIGHTEEN_PLUS,
      );

      expect(signals.watchedTitleIds.has('watched')).toBe(true);
      expect(signals.watchlistTitleIds.has('saved')).toBe(true);
    });
  });

  describe('score', () => {
    it('ranks a genre match above a neutral title of equal popularity', () => {
      const signals = engine.buildSignals(
        [makeTitle({ id: 'history', genres: ['Sci-Fi'] })],
        [],
        MaturityRating.EIGHTEEN_PLUS,
      );

      const match = engine.score(makeTitle({ id: 'x', genres: ['Sci-Fi'] }), signals, NOW);
      const neutral = engine.score(makeTitle({ id: 'y', genres: ['Horror'] }), signals, NOW);

      expect(match.score).toBeGreaterThan(neutral.score);
      expect(match.explanation).toContain('kedvelt műfajaid');
    });

    it('boosts recently published titles', () => {
      const fresh = engine.score(
        makeTitle({ id: 'fresh', publishedAt: new Date('2026-05-20T00:00:00.000Z') }),
        emptySignals,
        NOW,
      );
      const old = engine.score(makeTitle({ id: 'old' }), emptySignals, NOW);

      expect(fresh.score).toBeGreaterThan(old.score);
    });

    it('penalises titles the profile already watched', () => {
      const signals = engine.buildSignals([makeTitle({ id: 'seen' })], [], MaturityRating.EIGHTEEN_PLUS);

      const seen = engine.score(makeTitle({ id: 'seen' }), signals, NOW);
      const unseen = engine.score(makeTitle({ id: 'other' }), signals, NOW);

      expect(seen.score).toBeLessThan(unseen.score);
    });

    it('keeps the score inside the 0-100 range', () => {
      const result = engine.score(makeTitle({ popularity: 100, isOriginal: true }), emptySignals, NOW);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('rank', () => {
    it('drops titles above the profile maturity level', () => {
      const signals = engine.buildSignals([], [], MaturityRating.SEVEN_PLUS);

      const ranked = engine.rank(
        [
          makeTitle({ id: 'kids', maturityRating: MaturityRating.ALL }),
          makeTitle({ id: 'adult', maturityRating: MaturityRating.EIGHTEEN_PLUS }),
        ],
        signals,
        NOW,
        10,
      );

      expect(ranked.map((entry) => entry.title.id)).toEqual(['kids']);
    });

    it('returns the results ordered by score and honours the limit', () => {
      const ranked = engine.rank(
        [
          makeTitle({ id: 'low', popularity: 10 }),
          makeTitle({ id: 'high', popularity: 95 }),
          makeTitle({ id: 'mid', popularity: 50 }),
        ],
        emptySignals,
        NOW,
        2,
      );

      expect(ranked).toHaveLength(2);
      expect(ranked[0]?.title.id).toBe('high');
      expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[1]!.score);
    });
  });
});
