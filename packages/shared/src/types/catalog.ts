import type {
  MaturityRating,
  RecommendationReason,
  RowLayout,
  StreamProtocol,
  TitleKind,
} from '../enums';

/**
 * Deterministic artwork descriptor.
 *
 * NOVA renders every poster and backdrop from these values with CSS gradients
 * and generated SVG, so the platform ships zero third-party imagery.
 */
export interface ArtworkDto {
  /** Primary gradient stop, `#rrggbb`. */
  from: string;
  /** Secondary gradient stop, `#rrggbb`. */
  to: string;
  /** Gradient angle in degrees. */
  angle: number;
  /** Procedural pattern applied on top of the gradient. */
  pattern: 'grain' | 'rays' | 'waves' | 'grid' | 'orbit';
  /** Short wordmark drawn onto the artwork. */
  wordmark: string;
}

/** A single episode of a series. */
export interface EpisodeDto {
  id: string;
  titleId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  synopsis: string;
  durationSeconds: number;
  /** Playback asset key resolved by the playback module. */
  assetKey: string;
  artwork: ArtworkDto;
}

/** A season grouping of episodes. */
export interface SeasonDto {
  id: string;
  titleId: string;
  seasonNumber: number;
  name: string;
  episodes: EpisodeDto[];
}

/** Catalog entry as returned by list endpoints. */
export interface TitleSummaryDto {
  id: string;
  slug: string;
  name: string;
  kind: TitleKind;
  tagline: string;
  releaseYear: number;
  maturityRating: MaturityRating;
  /** Runtime for movies; `null` for series (use season/episode counts). */
  durationSeconds: number | null;
  seasonCount: number | null;
  genres: string[];
  moods: string[];
  /** 0-100 personalised match score. */
  matchScore: number;
  isOriginal: boolean;
  isNew: boolean;
  artwork: ArtworkDto;
}

/** Full catalog entry as returned by the title detail endpoint. */
export interface TitleDetailDto extends TitleSummaryDto {
  synopsis: string;
  cast: string[];
  directors: string[];
  writers: string[];
  country: string;
  languages: string[];
  subtitleLanguages: string[];
  audioLanguages: string[];
  seasons: SeasonDto[];
  /** Trailer asset key played on the detail page. */
  trailerAssetKey: string;
  /** Movie playback asset key; `null` for series. */
  assetKey: string | null;
  similarTitleIds: string[];
}

/** A horizontally scrolling row on the browse page. */
export interface CatalogRowDto {
  id: string;
  title: string;
  layout: RowLayout;
  reason: RecommendationReason;
  items: TitleSummaryDto[];
}

/** Payload backing the full-bleed hero at the top of the browse page. */
export interface BillboardDto {
  title: TitleSummaryDto;
  synopsis: string;
  /** Whether the profile already has this title in its list. */
  inMyList: boolean;
}

/** Aggregated browse payload — one request renders the whole page. */
export interface BrowsePageDto {
  billboard: BillboardDto;
  rows: CatalogRowDto[];
}

/** One item of the "continue watching" row. */
export interface ContinueWatchingItemDto {
  title: TitleSummaryDto;
  episode: EpisodeDto | null;
  positionSeconds: number;
  durationSeconds: number;
  percent: number;
  updatedAt: string;
}

/** Playback ticket handed to the video player. */
export interface PlaybackManifestDto {
  sessionId: string;
  titleId: string;
  episodeId: string | null;
  protocol: StreamProtocol;
  /** Adaptive manifest URL (`.m3u8` for HLS, `.mpd` for DASH). */
  manifestUrl: string;
  durationSeconds: number;
  startPositionSeconds: number;
  introStartSeconds: number | null;
  introEndSeconds: number | null;
  creditsStartSeconds: number | null;
  audioTracks: AudioTrackDto[];
  subtitleTracks: SubtitleTrackDto[];
  nextEpisodeId: string | null;
}

/** Selectable audio rendition. */
export interface AudioTrackDto {
  id: string;
  language: string;
  label: string;
  channels: '2.0' | '5.1' | 'Atmos';
  isDefault: boolean;
}

/** Selectable subtitle rendition. */
export interface SubtitleTrackDto {
  id: string;
  language: string;
  label: string;
  /** WebVTT URL served by the playback module. */
  url: string;
  isDefault: boolean;
  isForced: boolean;
}

/** Search hit with the matched field highlighted by the API. */
export interface SearchResultDto {
  title: TitleSummaryDto;
  score: number;
  matchedOn: 'name' | 'genre' | 'cast' | 'synopsis' | 'mood';
}
