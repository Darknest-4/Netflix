import { Inject, Injectable } from '@nestjs/common';
import {
  COMPLETION_THRESHOLD_PERCENT,
  type ContinueWatchingItemDto,
  createArtwork,
} from '@nova/shared';

import {
  CLOCK_PORT,
  EVENT_BUS_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type EventBusPort,
  type IdGeneratorPort,
} from '../../../common/application/ports';
import { EntityNotFound } from '../../../common/domain/domain.exceptions';
import { TitleMapper } from '../../catalog/application/title.mapper';
import { TITLE_REPOSITORY, type TitleRepository } from '../../catalog/domain/title.repository';
import { PROGRESS_REPOSITORY, type ProgressRepository } from '../domain/progress.repository';

/** Input of {@link RecordProgressUseCase}. */
export interface RecordProgressCommand {
  profileId: string;
  titleId: string;
  episodeId?: string | null;
  positionSeconds: number;
  durationSeconds: number;
}

/**
 * Stores the player heartbeat.
 *
 * The web player posts every 15 seconds and once more on pause/unload. Crossing
 * `COMPLETION_THRESHOLD_PERCENT` marks the item finished, which removes it from
 * "Folytasd a nézést" and makes the next episode the default resume target.
 */
@Injectable()
export class RecordProgressUseCase {
  /**
   * @param progress - Resume point repository.
   * @param titles - Catalog repository, used to bump popularity.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   * @param eventBus - Domain event publisher.
   */
  public constructor(
    @Inject(PROGRESS_REPOSITORY) private readonly progress: ProgressRepository,
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * @param command - Heartbeat payload.
   * @returns The stored percentage and completion flag.
   */
  public async execute(command: RecordProgressCommand): Promise<{
    percent: number;
    completed: boolean;
  }> {
    const duration = Math.max(1, Math.round(command.durationSeconds));
    const position = Math.min(duration, Math.max(0, Math.round(command.positionSeconds)));
    const percent = (position / duration) * 100;
    const completed = percent >= COMPLETION_THRESHOLD_PERCENT;

    const existing = await this.progress.find(
      command.profileId,
      command.titleId,
      command.episodeId ?? null,
    );

    await this.progress.save({
      id: existing?.id ?? this.ids.generate(),
      profileId: command.profileId,
      titleId: command.titleId,
      episodeId: command.episodeId ?? null,
      positionSeconds: position,
      durationSeconds: duration,
      completed,
      updatedAt: this.clock.now(),
    });

    await this.eventBus.publish('playback.progress', {
      profileId: command.profileId,
      titleId: command.titleId,
      percent: Math.round(percent),
    });

    if (!existing) {
      // First heartbeat of a session counts as a view for trending scores.
      const title = await this.titles.findById(command.titleId);
      if (title) {
        title.recordView();
        await this.titles.save(title);
      }
    }

    return { percent: Math.round(percent), completed };
  }
}

/** Builds the "Folytasd a nézést" row for a profile. */
@Injectable()
export class GetContinueWatchingUseCase {
  /**
   * @param progress - Resume point repository.
   * @param titles - Catalog repository.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(PROGRESS_REPOSITORY) private readonly progress: ProgressRepository,
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * @param profileId - Viewing profile.
   * @param limit - Maximum number of items.
   * @returns Unfinished items, most recently watched first.
   */
  public async execute(profileId: string, limit = 12): Promise<ContinueWatchingItemDto[]> {
    const records = await this.progress.findRecentByProfile(profileId, limit);
    const titles = await this.titles.findManyByIds(records.map((record) => record.titleId));
    const byId = new Map(titles.map((title) => [title.id, title]));
    const now = this.clock.now();

    return records.flatMap((record) => {
      const title = byId.get(record.titleId);
      if (!title) {
        return [];
      }

      const episode = record.episodeId ? title.findEpisode(record.episodeId) : null;

      return [
        {
          title: TitleMapper.toSummary(title, now),
          episode: episode
            ? {
                id: episode.id,
                titleId: title.id,
                seasonNumber: episode.seasonNumber,
                episodeNumber: episode.episodeNumber,
                name: episode.name,
                synopsis: episode.synopsis,
                durationSeconds: episode.durationSeconds,
                assetKey: episode.assetKey,
                artwork: createArtwork(episode.id, `${episode.episodeNumber}. rész`),
              }
            : null,
          positionSeconds: record.positionSeconds,
          durationSeconds: record.durationSeconds,
          percent: Math.round((record.positionSeconds / record.durationSeconds) * 100),
          updatedAt: record.updatedAt.toISOString(),
        },
      ];
    });
  }
}

/** Removes a title from the continue-watching row. */
@Injectable()
export class RemoveFromContinueWatchingUseCase {
  /**
   * @param progress - Resume point repository.
   * @param titles - Catalog repository, used to validate the title.
   */
  public constructor(
    @Inject(PROGRESS_REPOSITORY) private readonly progress: ProgressRepository,
    @Inject(TITLE_REPOSITORY) private readonly titles: TitleRepository,
  ) {}

  /**
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry to forget.
   * @throws {EntityNotFound} When the title does not exist.
   */
  public async execute(profileId: string, titleId: string): Promise<void> {
    if (!(await this.titles.findById(titleId))) {
      throw new EntityNotFound('Tartalom', titleId);
    }
    await this.progress.removeForTitle(profileId, titleId);
  }
}
