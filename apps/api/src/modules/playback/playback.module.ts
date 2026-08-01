import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../common/infrastructure/persistence/prisma.service';
import type { AppConfig } from '../../config/configuration';
import { CatalogModule } from '../catalog/catalog.module';
import { GetPlaybackManifestUseCase } from './application/get-playback-manifest.use-case';
import {
  GetContinueWatchingUseCase,
  RecordProgressUseCase,
  RemoveFromContinueWatchingUseCase,
} from './application/track-progress.use-cases';
import { PROGRESS_REPOSITORY } from './domain/progress.repository';
import {
  InMemoryProgressRepository,
  PrismaProgressRepository,
} from './infrastructure/progress.repositories';
import { PlaybackController } from './presentation/playback.controller';

/** Playback bounded context: manifests, subtitles, resume points. */
@Module({
  imports: [CatalogModule],
  controllers: [PlaybackController],
  providers: [
    GetPlaybackManifestUseCase,
    RecordProgressUseCase,
    GetContinueWatchingUseCase,
    RemoveFromContinueWatchingUseCase,
    {
      provide: PROGRESS_REPOSITORY,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService<AppConfig, true>, prisma: PrismaService) =>
        config.get('database', { infer: true }).driver === 'prisma'
          ? new PrismaProgressRepository(prisma)
          : new InMemoryProgressRepository(),
    },
  ],
  exports: [PROGRESS_REPOSITORY, GetContinueWatchingUseCase],
})
export class PlaybackModule {}
