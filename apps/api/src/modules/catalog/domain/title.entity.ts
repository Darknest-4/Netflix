import { MaturityRating, TitleKind, slugify } from '@nova/shared';

import { Entity } from '../../../common/domain/entity.base';
import { BusinessRuleViolation } from '../../../common/domain/domain.exceptions';

/** Episode state inside the `Title` aggregate. */
export interface EpisodeProps {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  synopsis: string;
  durationSeconds: number;
  assetKey: string;
}

/** Season state inside the `Title` aggregate. */
export interface SeasonProps {
  id: string;
  seasonNumber: number;
  name: string;
  episodes: EpisodeProps[];
}

/** Persistent state of the `Title` aggregate. */
export interface TitleProps {
  id: string;
  slug: string;
  name: string;
  kind: TitleKind;
  tagline: string;
  synopsis: string;
  releaseYear: number;
  maturityRating: MaturityRating;
  durationSeconds: number | null;
  genres: string[];
  moods: string[];
  cast: string[];
  directors: string[];
  writers: string[];
  country: string;
  languages: string[];
  subtitleLanguages: string[];
  audioLanguages: string[];
  isOriginal: boolean;
  isPublished: boolean;
  popularity: number;
  trendingScore: number;
  trailerAssetKey: string;
  assetKey: string | null;
  publishedAt: Date;
  seasons: SeasonProps[];
}

/** A title published within this many days is badged as "Újdonság". */
const NEW_RELEASE_WINDOW_DAYS = 45;

/**
 * Catalog aggregate root.
 *
 * A movie owns a playback asset; a series owns seasons and episodes. The
 * aggregate guards that invariant, computes derived facts used across the
 * product (episode count, total runtime, "new" badge) and owns publishing.
 */
export class Title extends Entity<TitleProps> {
  /**
   * Rehydrates an aggregate from storage.
   *
   * @param props - Persisted state.
   * @returns The reconstructed aggregate.
   */
  public static rehydrate(props: TitleProps): Title {
    return new Title(props);
  }

  /**
   * Creates a catalog entry from CMS input.
   *
   * @param input - Editorial payload; the slug is derived from the name when omitted.
   * @returns The created aggregate.
   * @throws {BusinessRuleViolation} When the kind and the assets disagree.
   */
  public static create(input: Omit<TitleProps, 'slug'> & { slug?: string }): Title {
    const props: TitleProps = { ...input, slug: input.slug?.trim() || slugify(input.name) };
    Title.assertConsistent(props);
    return new Title(props);
  }

  /**
   * Validates the movie/series invariant.
   *
   * @param props - Candidate state.
   * @throws {BusinessRuleViolation} When a movie has no asset or a series no episode.
   */
  private static assertConsistent(props: TitleProps): void {
    if (props.kind === TitleKind.MOVIE && !props.assetKey) {
      throw new BusinessRuleViolation('Filmhez kötelező lejátszási asset megadása.');
    }
    if (props.kind === TitleKind.SERIES && props.seasons.length === 0) {
      throw new BusinessRuleViolation('Sorozathoz legalább egy évad szükséges.');
    }
  }

  /** URL identifier used by the web app. */
  public get slug(): string {
    return this.props.slug;
  }

  /** Display name. */
  public get name(): string {
    return this.props.name;
  }

  /** Movie or series. */
  public get kind(): TitleKind {
    return this.props.kind;
  }

  /** Age classification. */
  public get maturityRating(): MaturityRating {
    return this.props.maturityRating;
  }

  /** Genre labels. */
  public get genres(): string[] {
    return [...this.props.genres];
  }

  /** Mood labels used by the affinity scorer. */
  public get moods(): string[] {
    return [...this.props.moods];
  }

  /** Editorial popularity score (0-100). */
  public get popularity(): number {
    return this.props.popularity;
  }

  /** Rolling 7-day trending score. */
  public get trendingScore(): number {
    return this.props.trendingScore;
  }

  /** Whether the entry is visible to members. */
  public get isPublished(): boolean {
    return this.props.isPublished;
  }

  /** Seasons, empty for movies. */
  public get seasons(): SeasonProps[] {
    return this.props.seasons;
  }

  /** Number of seasons, or `null` for movies. */
  public get seasonCount(): number | null {
    return this.props.kind === TitleKind.SERIES ? this.props.seasons.length : null;
  }

  /**
   * Decides whether the "Újdonság" badge should be rendered.
   *
   * @param now - Current instant.
   * @returns True when published within the new-release window.
   */
  public isNew(now: Date): boolean {
    const ageDays = (now.getTime() - this.props.publishedAt.getTime()) / 86_400_000;
    return ageDays >= 0 && ageDays <= NEW_RELEASE_WINDOW_DAYS;
  }

  /**
   * Finds an episode anywhere in the aggregate.
   *
   * @param episodeId - Episode identifier.
   * @returns The episode, or `null`.
   */
  public findEpisode(episodeId: string): EpisodeProps | null {
    for (const season of this.props.seasons) {
      const episode = season.episodes.find((candidate) => candidate.id === episodeId);
      if (episode) {
        return episode;
      }
    }
    return null;
  }

  /**
   * Returns the episode that follows the given one, crossing season borders.
   *
   * @param episodeId - Current episode.
   * @returns The next episode, or `null` at the end of the series.
   */
  public findNextEpisode(episodeId: string): EpisodeProps | null {
    const ordered = this.props.seasons
      .slice()
      .sort((a, b) => a.seasonNumber - b.seasonNumber)
      .flatMap((season) =>
        season.episodes.slice().sort((a, b) => a.episodeNumber - b.episodeNumber),
      );

    const index = ordered.findIndex((episode) => episode.id === episodeId);
    return index >= 0 && index + 1 < ordered.length ? (ordered[index + 1] as EpisodeProps) : null;
  }

  /** @returns The first episode of the first season, or `null` for movies. */
  public firstEpisode(): EpisodeProps | null {
    const firstSeason = this.props.seasons
      .slice()
      .sort((a, b) => a.seasonNumber - b.seasonNumber)[0];
    if (!firstSeason) {
      return null;
    }
    return (
      firstSeason.episodes.slice().sort((a, b) => a.episodeNumber - b.episodeNumber)[0] ?? null
    );
  }

  /**
   * Applies an editorial update from the CMS.
   *
   * @param changes - Fields to change.
   */
  public update(changes: Partial<Omit<TitleProps, 'id'>>): void {
    Object.assign(this.props, changes);
    if (changes.name && !changes.slug) {
      this.props.slug = slugify(changes.name);
    }
    Title.assertConsistent(this.props);
  }

  /**
   * Publishes or unpublishes the entry.
   *
   * @param published - Target visibility.
   * @param now - Instant recorded as the publication date.
   */
  public setPublished(published: boolean, now: Date): void {
    this.props.isPublished = published;
    if (published) {
      this.props.publishedAt = now;
    }
  }

  /**
   * Increments the popularity counters after a play.
   *
   * @param weight - Number of views to record.
   */
  public recordView(weight = 1): void {
    this.props.popularity = Math.min(100, this.props.popularity + weight);
    this.props.trendingScore += weight;
  }
}
