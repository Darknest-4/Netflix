import {
  type EpisodeDto,
  type SeasonDto,
  type TitleDetailDto,
  type TitleSummaryDto,
  createArtwork,
} from '@nova/shared';

import type { Title } from '../domain/title.entity';

/**
 * Projects catalog aggregates onto their API representations.
 *
 * Artwork is generated deterministically from the entity id, so the API never
 * stores or serves third-party imagery, and the same title always looks the
 * same on every client.
 */
export class TitleMapper {
  /**
   * @param title - Aggregate to expose.
   * @param now - Reference instant for the "new release" badge.
   * @param matchScore - Personalised score; defaults to editorial popularity.
   * @returns Compact list representation.
   */
  public static toSummary(title: Title, now: Date, matchScore?: number): TitleSummaryDto {
    const snapshot = title.snapshot();
    return {
      id: snapshot.id,
      slug: snapshot.slug,
      name: snapshot.name,
      kind: snapshot.kind,
      tagline: snapshot.tagline,
      releaseYear: snapshot.releaseYear,
      maturityRating: snapshot.maturityRating,
      durationSeconds: snapshot.durationSeconds,
      seasonCount: title.seasonCount,
      genres: snapshot.genres,
      moods: snapshot.moods,
      matchScore: Math.round(matchScore ?? snapshot.popularity),
      isOriginal: snapshot.isOriginal,
      isNew: title.isNew(now),
      artwork: createArtwork(snapshot.id, snapshot.name),
    };
  }

  /**
   * @param title - Aggregate to expose.
   * @param now - Reference instant for the "new release" badge.
   * @param similarTitleIds - Ids rendered in the "Hasonló címek" section.
   * @param matchScore - Personalised score.
   * @returns Full detail representation.
   */
  public static toDetail(
    title: Title,
    now: Date,
    similarTitleIds: string[] = [],
    matchScore?: number,
  ): TitleDetailDto {
    const snapshot = title.snapshot();
    return {
      ...TitleMapper.toSummary(title, now, matchScore),
      synopsis: snapshot.synopsis,
      cast: snapshot.cast,
      directors: snapshot.directors,
      writers: snapshot.writers,
      country: snapshot.country,
      languages: snapshot.languages,
      subtitleLanguages: snapshot.subtitleLanguages,
      audioLanguages: snapshot.audioLanguages,
      seasons: snapshot.seasons.map((season): SeasonDto => ({
        id: season.id,
        titleId: snapshot.id,
        seasonNumber: season.seasonNumber,
        name: season.name,
        episodes: season.episodes.map(
          (episode): EpisodeDto => ({
            id: episode.id,
            titleId: snapshot.id,
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            name: episode.name,
            synopsis: episode.synopsis,
            durationSeconds: episode.durationSeconds,
            assetKey: episode.assetKey,
            artwork: createArtwork(episode.id, `${episode.episodeNumber}. rész`),
          }),
        ),
      })),
      trailerAssetKey: snapshot.trailerAssetKey,
      assetKey: snapshot.assetKey,
      similarTitleIds,
    };
  }
}
