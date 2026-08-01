import { MaturityRating, TitleKind } from '@nova/shared';

import { BusinessRuleViolation } from '../../../common/domain/domain.exceptions';
import { Title, type TitleProps } from './title.entity';

/** Fixed instant so the "new release" window is deterministic. */
const NOW = new Date('2026-06-01T00:00:00.000Z');

/**
 * Builds aggregate state for the tests.
 *
 * @param overrides - Fields to override.
 * @returns Complete `TitleProps`.
 */
function props(overrides: Partial<TitleProps> = {}): TitleProps {
  return {
    id: 'title-1',
    slug: 'eszaki-feny',
    name: 'Északi Fény',
    kind: TitleKind.MOVIE,
    tagline: '',
    synopsis: 'Leírás',
    releaseYear: 2026,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    durationSeconds: 6000,
    genres: ['Thriller'],
    moods: ['Feszült'],
    cast: [],
    directors: [],
    writers: [],
    country: 'HU',
    languages: ['hu'],
    subtitleLanguages: ['hu'],
    audioLanguages: ['hu'],
    isOriginal: true,
    isPublished: true,
    popularity: 80,
    trendingScore: 100,
    trailerAssetKey: 'trailer.m3u8',
    assetKey: 'feature.m3u8',
    publishedAt: new Date('2026-05-25T00:00:00.000Z'),
    seasons: [],
    ...overrides,
  };
}

/** Two seasons of two episodes each. */
const SEASONS: TitleProps['seasons'] = [
  {
    id: 's1',
    seasonNumber: 1,
    name: '1. évad',
    episodes: [
      { id: 's1e1', seasonNumber: 1, episodeNumber: 1, name: '1. rész', synopsis: '', durationSeconds: 2400, assetKey: 'a' },
      { id: 's1e2', seasonNumber: 1, episodeNumber: 2, name: '2. rész', synopsis: '', durationSeconds: 2400, assetKey: 'b' },
    ],
  },
  {
    id: 's2',
    seasonNumber: 2,
    name: '2. évad',
    episodes: [
      { id: 's2e1', seasonNumber: 2, episodeNumber: 1, name: '1. rész', synopsis: '', durationSeconds: 2400, assetKey: 'c' },
    ],
  },
];

describe('Title aggregate', () => {
  describe('invariants', () => {
    it('rejects a movie without a playback asset', () => {
      expect(() => Title.create({ ...props({ assetKey: null }) })).toThrow(BusinessRuleViolation);
    });

    it('rejects a series without seasons', () => {
      expect(() =>
        Title.create({ ...props({ kind: TitleKind.SERIES, assetKey: null, seasons: [] }) }),
      ).toThrow(BusinessRuleViolation);
    });

    it('derives the slug from the name when omitted', () => {
      const title = Title.create({ ...props(), slug: undefined, name: 'Vörös Homok' });
      expect(title.slug).toBe('voros-homok');
    });
  });

  describe('episode navigation', () => {
    const series = Title.rehydrate(
      props({ kind: TitleKind.SERIES, assetKey: null, seasons: SEASONS }),
    );

    it('finds an episode anywhere in the aggregate', () => {
      expect(series.findEpisode('s2e1')?.name).toBe('1. rész');
      expect(series.findEpisode('missing')).toBeNull();
    });

    it('returns the first episode of the first season', () => {
      expect(series.firstEpisode()?.id).toBe('s1e1');
    });

    it('crosses the season border when finding the next episode', () => {
      expect(series.findNextEpisode('s1e2')?.id).toBe('s2e1');
    });

    it('returns null after the last episode', () => {
      expect(series.findNextEpisode('s2e1')).toBeNull();
    });

    it('reports the season count for series and null for movies', () => {
      expect(series.seasonCount).toBe(2);
      expect(Title.rehydrate(props()).seasonCount).toBeNull();
    });
  });

  describe('publication state', () => {
    it('flags a recently published title as new', () => {
      expect(Title.rehydrate(props()).isNew(NOW)).toBe(true);
    });

    it('does not flag an old title as new', () => {
      const old = Title.rehydrate(props({ publishedAt: new Date('2025-01-01T00:00:00.000Z') }));
      expect(old.isNew(NOW)).toBe(false);
    });

    it('stamps the publication date when published', () => {
      const title = Title.rehydrate(props({ isPublished: false }));
      title.setPublished(true, NOW);

      expect(title.isPublished).toBe(true);
      expect(title.snapshot().publishedAt).toEqual(NOW);
    });
  });

  describe('recordView', () => {
    it('raises the trending score and caps popularity at 100', () => {
      const title = Title.rehydrate(props({ popularity: 99, trendingScore: 5 }));
      title.recordView(10);

      expect(title.popularity).toBe(100);
      expect(title.trendingScore).toBe(15);
    });
  });
});
