import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags, PartialType } from '@nestjs/swagger';
import {
  MaturityRating,
  TitleKind,
  UserRole,
  type PaginatedResponse,
  type TitleDetailDto,
  type TitleSummaryDto,
} from '@nova/shared';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { Roles } from '../../../common/presentation/decorators';
import {
  CreateTitleUseCase,
  DeleteTitleUseCase,
  ListTitlesForAdminUseCase,
  UpdateTitleUseCase,
} from '../application/manage-catalog.use-cases';

/** Episode payload of the CMS editor. */
export class AdminEpisodeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  public episodeNumber!: number;

  @ApiProperty({ example: '1. rész' })
  @IsString()
  @Length(1, 120)
  public name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public synopsis?: string;

  @ApiProperty({ example: 2760 })
  @IsInt()
  @Min(1)
  public durationSeconds!: number;
}

/** Season payload of the CMS editor. */
export class AdminSeasonDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  public seasonNumber!: number;

  @ApiPropertyOptional({ example: '1. évad' })
  @IsOptional()
  @IsString()
  public name?: string;

  @ApiProperty({ type: [AdminEpisodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminEpisodeDto)
  public episodes!: AdminEpisodeDto[];
}

/** Body of `POST /admin/titles`. */
export class CreateTitleDto {
  @ApiProperty({ example: 'Északi Fény' })
  @IsString()
  @Length(1, 160)
  public name!: string;

  @ApiProperty({ enum: TitleKind })
  @IsEnum(TitleKind)
  public kind!: TitleKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  public tagline?: string;

  @ApiProperty()
  @IsString()
  @Length(10, 2000)
  public synopsis!: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  public releaseYear!: number;

  @ApiProperty({ enum: MaturityRating })
  @IsEnum(MaturityRating)
  public maturityRating!: MaturityRating;

  @ApiPropertyOptional({ example: 7080 })
  @IsOptional()
  @IsInt()
  @Min(1)
  public durationSeconds?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  public genres?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  public moods?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  public cast?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  public directors?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  public writers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isOriginal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isPublished?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  public popularity?: number;

  @ApiPropertyOptional({ type: [AdminSeasonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminSeasonDto)
  public seasons?: AdminSeasonDto[];
}

/**
 * Body of `PATCH /admin/titles/:id`.
 *
 * Derived from {@link CreateTitleDto} with every property made optional, so the
 * validation rules of the two endpoints can never drift apart.
 */
export class UpdateTitleDto extends PartialType(CreateTitleDto) {}

/** Content management endpoints, restricted to administrators. */
@ApiTags('admin')
@Roles(UserRole.ADMIN)
@Controller('admin/titles')
export class AdminCatalogController {
  /**
   * @param listForAdmin - CMS listing use case.
   * @param createTitle - Creation use case.
   * @param updateTitle - Update use case.
   * @param deleteTitle - Deletion use case.
   */
  public constructor(
    private readonly listForAdmin: ListTitlesForAdminUseCase,
    private readonly createTitle: CreateTitleUseCase,
    private readonly updateTitle: UpdateTitleUseCase,
    private readonly deleteTitle: DeleteTitleUseCase,
  ) {}

  /**
   * @param page - 1-based page index.
   * @param perPage - Page size.
   * @param search - Optional free-text filter.
   * @returns Page of entries, drafts included.
   */
  @Get()
  @ApiOperation({ summary: 'Tartalmak listája (piszkozatokkal együtt)' })
  public async list(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<TitleSummaryDto>> {
    return this.listForAdmin.execute({
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 20,
      search,
    });
  }

  /**
   * @param dto - Editorial payload.
   * @returns The created entry.
   */
  @Post()
  @ApiOperation({ summary: 'Új tartalom létrehozása' })
  public async create(@Body() dto: CreateTitleDto): Promise<TitleDetailDto> {
    return this.createTitle.execute(dto);
  }

  /**
   * @param id - Entry identifier.
   * @param dto - Fields to change.
   * @returns The updated entry.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Tartalom módosítása' })
  public async update(
    @Param('id') id: string,
    @Body() dto: Partial<UpdateTitleDto>,
  ): Promise<TitleDetailDto> {
    return this.updateTitle.execute(id, dto);
  }

  /**
   * @param id - Entry identifier.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Tartalom törlése' })
  public async remove(@Param('id') id: string): Promise<void> {
    await this.deleteTitle.execute(id);
  }
}
