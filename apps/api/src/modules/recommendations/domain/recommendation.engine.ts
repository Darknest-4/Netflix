import { MATURITY_WEIGHT, type MaturityRating } from '@nova/shared';

import type { Title } from '../../catalog/domain/title.entity';

/** Behavioural signals of a profile, collected by the browse use case. */
export interface ProfileSignals {
  /** Genres the profile watched or saved, with occurrence counts. */
  genreAffinity: Map<string, number>;
  /** Moods the profile watched or saved, with occurrence counts. */
  moodAffinity: Map<string, number>;
  /** Titles already on the list — boosted, never re-recommended as "new". */
  watchlistTitleIds: Set<string>;
  /** Titles with a resume point. */
  watchedTitleIds: Set<string>;
  /** Maximum rating the profile is allowed to see. */
  maturityLevel: MaturityRating;
}

/** A scored candidate produced by {@link RecommendationEngine.score}. */
export interface ScoredTitle {
  title: Title;
  score: number;
  /** Human readable explanation, surfaced as the "match" badge tooltip. */
  explanation: string;
}

/**
 * Content-based recommendation engine.
 *
 * The scoring is deliberately transparent and dependency free — it is a pure
 * domain service, unit tested in isolation and runnable inside a request. The
 * weights are tuned so that a strong genre affinity can outrank raw popularity,
 * while newly published titles still get a visible boost.
 */
export class RecommendationEngine {
  /** Weight of the editorial popularity signal. */
  private static readonly POPULARITY_WEIGHT = 0.35;

  /** Weight of the genre affinity signal. */
  private static readonly GENRE_WEIGHT = 9;

  /** Weight of the mood affinity signal. */
  private static readonly MOOD_WEIGHT = 5;

  /** Flat bonus applied to recently published titles. */
  private static readonly RECENCY_BONUS = 12;

  /** Flat bonus applied to platform originals. */
  private static readonly ORIGINAL_BONUS = 6;

  /** Penalty applied to titles the profile already finished browsing past. */
  private static readonly ALREADY_WATCHED_PENALTY = 25;

  /**
   * Scores a single candidate for a profile.
   *
   * @param title - Candidate catalog entry.
   * @param signals - Behavioural signals of the profile.
   * @param now - Reference instant.
   * @returns Score in the 0-100 range plus an explanation.
   */
  public score(title: Title, signals: ProfileSignals, now: Date): ScoredTitle {
    const reasons: string[] = [];
    let score = title.popularity * RecommendationEngine.POPULARITY_WEIGHT;

    const genreHits = title.genres.reduce(
      (sum, genre) => sum + (signals.genreAffinity.get(genre) ?? 0),
      0,
    );
    if (genreHits > 0) {
      score += Math.min(30, genreHits * RecommendationEngine.GENRE_WEIGHT);
      reasons.push('a kedvelt műfajaid alapján');
    }

    const moodHits = title.moods.reduce(
      (sum, mood) => sum + (signals.moodAffinity.get(mood) ?? 0),
      0,
    );
    if (moodHits > 0) {
      score += Math.min(15, moodHits * RecommendationEngine.MOOD_WEIGHT);
      reasons.push('a hangulati preferenciáid alapján');
    }

    if (title.isNew(now)) {
      score += RecommendationEngine.RECENCY_BONUS;
      reasons.push('friss megjelenés');
    }

    if (title.snapshot().isOriginal) {
      score += RecommendationEngine.ORIGINAL_BONUS;
      reasons.push('NOVA saját gyártás');
    }

    if (signals.watchedTitleIds.has(title.id)) {
      score -= RecommendationEngine.ALREADY_WATCHED_PENALTY;
    }

    return {
      title,
      score: Math.max(0, Math.min(100, Math.round(score))),
      explanation: reasons.length > 0 ? `Ajánlva ${reasons.join(', ')}.` : 'Népszerű most.',
    };
  }

  /**
   * Scores and orders a candidate set, dropping anything above the profile's
   * maturity level.
   *
   * @param titles - Candidate catalog entries.
   * @param signals - Behavioural signals of the profile.
   * @param now - Reference instant.
   * @param limit - Maximum number of results.
   * @returns Scored candidates, best first.
   */
  public rank(
    titles: Title[],
    signals: ProfileSignals,
    now: Date,
    limit: number,
  ): ScoredTitle[] {
    const ceiling = MATURITY_WEIGHT[signals.maturityLevel];

    return titles
      .filter((title) => MATURITY_WEIGHT[title.maturityRating] <= ceiling)
      .map((title) => this.score(title, signals, now))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Derives affinity maps from what a profile watched and saved.
   *
   * @param watched - Titles with a resume point.
   * @param saved - Titles on the watchlist.
   * @param maturityLevel - Parental restriction of the profile.
   * @returns Signals consumed by {@link rank}.
   */
  public buildSignals(
    watched: Title[],
    saved: Title[],
    maturityLevel: MaturityRating,
  ): ProfileSignals {
    const genreAffinity = new Map<string, number>();
    const moodAffinity = new Map<string, number>();

    // Watching is a stronger signal than saving for later.
    const contributions: Array<[Title[], number]> = [
      [watched, 2],
      [saved, 1],
    ];

    for (const [titles, weight] of contributions) {
      for (const title of titles) {
        for (const genre of title.genres) {
          genreAffinity.set(genre, (genreAffinity.get(genre) ?? 0) + weight);
        }
        for (const mood of title.moods) {
          moodAffinity.set(mood, (moodAffinity.get(mood) ?? 0) + weight);
        }
      }
    }

    return {
      genreAffinity,
      moodAffinity,
      watchlistTitleIds: new Set(saved.map((title) => title.id)),
      watchedTitleIds: new Set(watched.map((title) => title.id)),
      maturityLevel,
    };
  }
}
