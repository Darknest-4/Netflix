import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AudioTrackDto,
  type PlaybackManifestDto,
  type SubtitleTrackDto,
  LANGUAGES,
  StreamProtocol,
  TitleKind,
} from '@nova/shared';

import {
  CLOCK_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type IdGeneratorPort,
} from '../../../common/application/ports';
import { BusinessRuleViolation, EntityNotFound } from '../../../common/domain/domain.exceptions';
import type { AppConfig } from '../../../config/configuration';
import type { EpisodeProps } from '../../catalog/domain/title.entity';
import { TITLE_REPOSITORY, type TitleRepository } from '../../catalog/domain/title.repository';
import { PROGRESS_REPOSITORY, type ProgressRepository } from '../domain/progress.repository';

/** Input of {@link GetPlaybackManifestUseCase}. */
export interface GetManifestQuery {
  profileId: string;
  titleId: string;
  episodeId?: string;
  /** Requests the trailer rendition instead of the feature. */
  trailer?: boolean;
  protocol?: StreamProtocol;
}

/**
 * Issues a playback ticket for the player.
 *
 * The use case resolves which asset to play (movie, specific episode, next
 * unwatched episode or trailer), where to resume from, and which audio and
 * subtitle renditions are available.
 */
@Injectable()
export class GetPlaybackManifestUseCase {
  /**
   * @param titles - Catalog repository.
   * @param progress - Resume point repository.
   * @param config - Runtime configuration (CDN base URL).
   * @param ids - Identifier factory for the playback session id.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(PROGRESS_REPOSITORY) private readonly progress: ProgressRepository,
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param query - Requested title, episode and protocol.
   * @returns Everything the player needs to start rendering.
   * @throws {EntityNotFound} When the title or the episode is unknown.
   * @throws {BusinessRuleViolation} When a series has no playable episode.
   */
  public async execute(query: GetManifestQuery): Promise<PlaybackManifestDto> {
    const title = await this.titles.findById(query.titleId);
    if (!title) {
      throw new EntityNotFound('Tartalom', query.titleId);
    }

    const streaming = this.config.get('streaming', { infer: true });
    const snapshot = title.snapshot();

    if (query.trailer) {
      return this.buildManifest({
        titleId: title.id,
        episodeId: null,
        assetKey: snapshot.trailerAssetKey,
        durationSeconds: 150,
        startPositionSeconds: 0,
        introRange: null,
        creditsStart: null,
        nextEpisodeId: null,
        subtitleLanguages: snapshot.subtitleLanguages,
        audioLanguages: snapshot.audioLanguages,
        protocol: query.protocol ?? StreamProtocol.HLS,
        cdnBaseUrl: streaming.cdnBaseUrl,
        demoHlsUrl: streaming.demoHlsUrl,
      });
    }

    if (snapshot.kind === TitleKind.MOVIE) {
      const resume = await this.progress.find(query.profileId, title.id, null);
      const duration = snapshot.durationSeconds ?? 5_400;

      return this.buildManifest({
        titleId: title.id,
        episodeId: null,
        assetKey: snapshot.assetKey ?? `${snapshot.slug}/feature/master.m3u8`,
        durationSeconds: duration,
        startPositionSeconds: resume?.completed ? 0 : (resume?.positionSeconds ?? 0),
        introRange: [45, 105],
        creditsStart: Math.max(0, duration - 180),
        nextEpisodeId: null,
        subtitleLanguages: snapshot.subtitleLanguages,
        audioLanguages: snapshot.audioLanguages,
        protocol: query.protocol ?? StreamProtocol.HLS,
        cdnBaseUrl: streaming.cdnBaseUrl,
        demoHlsUrl: streaming.demoHlsUrl,
      });
    }

    const episode = query.episodeId
      ? title.findEpisode(query.episodeId)
      : await this.resolveNextEpisode(query.profileId, title.id);

    if (!episode) {
      throw new BusinessRuleViolation('A sorozathoz nem található lejátszható epizód.');
    }

    const resume = await this.progress.find(query.profileId, title.id, episode.id);

    return this.buildManifest({
      titleId: title.id,
      episodeId: episode.id,
      assetKey: episode.assetKey,
      durationSeconds: episode.durationSeconds,
      startPositionSeconds: resume?.completed ? 0 : (resume?.positionSeconds ?? 0),
      introRange: [12, 72],
      creditsStart: Math.max(0, episode.durationSeconds - 90),
      nextEpisodeId: title.findNextEpisode(episode.id)?.id ?? null,
      subtitleLanguages: snapshot.subtitleLanguages,
      audioLanguages: snapshot.audioLanguages,
      protocol: query.protocol ?? StreamProtocol.HLS,
      cdnBaseUrl: streaming.cdnBaseUrl,
      demoHlsUrl: streaming.demoHlsUrl,
    });
  }

  /**
   * Picks the episode a returning viewer should continue with.
   *
   * @param profileId - Viewing profile.
   * @param titleId - Series identifier.
   * @returns The unfinished episode, the following one, or the very first.
   */
  private async resolveNextEpisode(
    profileId: string,
    titleId: string,
  ): Promise<EpisodeProps | null> {
    const title = await this.titles.findById(titleId);
    if (!title) {
      return null;
    }

    const latest = await this.progress.findLatestForTitle(profileId, titleId);
    if (!latest?.episodeId) {
      return title.firstEpisode();
    }

    return latest.completed
      ? (title.findNextEpisode(latest.episodeId) ?? title.firstEpisode())
      : title.findEpisode(latest.episodeId);
  }

  /**
   * Assembles the manifest DTO.
   *
   * @param input - Resolved asset, timings and track languages.
   * @returns Playback manifest.
   */
  private buildManifest(input: {
    titleId: string;
    episodeId: string | null;
    assetKey: string;
    durationSeconds: number;
    startPositionSeconds: number;
    introRange: [number, number] | null;
    creditsStart: number | null;
    nextEpisodeId: string | null;
    subtitleLanguages: string[];
    audioLanguages: string[];
    protocol: StreamProtocol;
    cdnBaseUrl: string;
    demoHlsUrl: string;
  }): PlaybackManifestDto {
    const extension = input.protocol === StreamProtocol.DASH ? 'mpd' : 'm3u8';
    const packagedUrl = `${input.cdnBaseUrl.replace(/\/$/, '')}/${input.assetKey.replace(/\.m3u8$/, '')}.${extension}`;

    return {
      sessionId: this.ids.generate(),
      titleId: input.titleId,
      episodeId: input.episodeId,
      protocol: input.protocol,
      // In a packaged environment `packagedUrl` points at the CDN; the demo
      // stream keeps the player functional before any media is ingested.
      manifestUrl: input.demoHlsUrl || packagedUrl,
      durationSeconds: input.durationSeconds,
      startPositionSeconds: input.startPositionSeconds,
      introStartSeconds: input.introRange?.[0] ?? null,
      introEndSeconds: input.introRange?.[1] ?? null,
      creditsStartSeconds: input.creditsStart,
      audioTracks: input.audioLanguages.map(
        (code, index): AudioTrackDto => ({
          id: `audio-${code}`,
          language: code,
          label: LANGUAGES.find((entry) => entry.code === code)?.label ?? code.toUpperCase(),
          channels: index === 0 ? '5.1' : '2.0',
          isDefault: index === 0,
        }),
      ),
      subtitleTracks: input.subtitleLanguages.map(
        (code, index): SubtitleTrackDto => ({
          id: `sub-${code}`,
          language: code,
          label: LANGUAGES.find((entry) => entry.code === code)?.label ?? code.toUpperCase(),
          url: `/playback/subtitles/${input.titleId}/${code}.vtt`,
          isDefault: index === 0,
          isForced: false,
        }),
      ),
      nextEpisodeId: input.nextEpisodeId,
    };
  }
}
