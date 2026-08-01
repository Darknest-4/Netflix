import { Body, Controller, Delete, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import {
  StreamProtocol,
  type ContinueWatchingItemDto,
  type PlaybackManifestDto,
} from '@nova/shared';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { Public } from '../../../common/presentation/decorators';
import { GetPlaybackManifestUseCase } from '../application/get-playback-manifest.use-case';
import {
  GetContinueWatchingUseCase,
  RecordProgressUseCase,
  RemoveFromContinueWatchingUseCase,
} from '../application/track-progress.use-cases';
import { buildSubtitleTrack } from '../infrastructure/subtitle.generator';

/** Query of `GET /playback/manifest`. */
export class ManifestQueryDto {
  @ApiProperty()
  @IsString()
  public profileId!: string;

  @ApiProperty()
  @IsString()
  public titleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public episodeId?: string;

  @ApiPropertyOptional({ description: 'Előzetes lejátszása a teljes tartalom helyett.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public trailer?: boolean;

  @ApiPropertyOptional({ enum: StreamProtocol })
  @IsOptional()
  @IsEnum(StreamProtocol)
  public protocol?: StreamProtocol;
}

/** Body of `POST /playback/progress`. */
export class ProgressDto {
  @ApiProperty()
  @IsString()
  public profileId!: string;

  @ApiProperty()
  @IsString()
  public titleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public episodeId?: string;

  @ApiProperty({ example: 620 })
  @IsInt()
  @Min(0)
  public positionSeconds!: number;

  @ApiProperty({ example: 2760 })
  @IsInt()
  @Min(1)
  public durationSeconds!: number;
}

/** Playback endpoints: manifests, subtitles and progress tracking. */
@ApiTags('playback')
@Controller('playback')
export class PlaybackController {
  /**
   * @param getManifest - Manifest use case.
   * @param recordProgress - Heartbeat use case.
   * @param getContinueWatching - Continue watching query.
   * @param removeFromContinue - Removal use case.
   */
  public constructor(
    private readonly getManifest: GetPlaybackManifestUseCase,
    private readonly recordProgress: RecordProgressUseCase,
    private readonly getContinueWatching: GetContinueWatchingUseCase,
    private readonly removeFromContinue: RemoveFromContinueWatchingUseCase,
  ) {}

  /**
   * @param query - Requested title, episode and protocol.
   * @returns Playback ticket for the player.
   */
  @Get('manifest')
  @ApiOperation({ summary: 'Lejátszási manifest (HLS/DASH) kérése' })
  public async manifest(@Query() query: ManifestQueryDto): Promise<PlaybackManifestDto> {
    return this.getManifest.execute({
      profileId: query.profileId,
      titleId: query.titleId,
      episodeId: query.episodeId,
      trailer: query.trailer,
      protocol: query.protocol,
    });
  }

  /**
   * @param dto - Heartbeat payload.
   * @returns Stored percentage and completion flag.
   */
  @Post('progress')
  @ApiOperation({ summary: 'Lejátszási pozíció mentése' })
  public async progress(@Body() dto: ProgressDto): Promise<{ percent: number; completed: boolean }> {
    return this.recordProgress.execute(dto);
  }

  /**
   * @param profileId - Viewing profile.
   * @returns Unfinished items of the profile.
   */
  @Get('continue-watching/:profileId')
  @ApiOperation({ summary: 'Folytasd a nézést lista' })
  public async continueWatching(
    @Param('profileId') profileId: string,
  ): Promise<ContinueWatchingItemDto[]> {
    return this.getContinueWatching.execute(profileId);
  }

  /**
   * @param profileId - Viewing profile.
   * @param titleId - Catalog entry to forget.
   * @returns Acknowledgement.
   */
  @Delete('continue-watching/:profileId/:titleId')
  @ApiOperation({ summary: 'Elem eltávolítása a Folytasd a nézést listából' })
  public async removeContinue(
    @Param('profileId') profileId: string,
    @Param('titleId') titleId: string,
  ): Promise<{ success: boolean }> {
    await this.removeFromContinue.execute(profileId, titleId);
    return { success: true };
  }

  /**
   * Serves a WebVTT subtitle track.
   *
   * The track is generated from the title metadata so subtitle switching,
   * styling and the "feliratok" menu are fully demonstrable without ingesting
   * real media.
   *
   * @param titleId - Catalog entry.
   * @param file - `<language>.vtt`, e.g. `hu.vtt`.
   * @returns WebVTT document.
   */
  @Public()
  @Get('subtitles/:titleId/:file')
  @Header('Content-Type', 'text/vtt; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Felirat (WebVTT) letöltése' })
  public subtitles(@Param('titleId') titleId: string, @Param('file') file: string): string {
    const language = file.replace(/\.vtt$/i, '');
    return buildSubtitleTrack(titleId, language);
  }
}
