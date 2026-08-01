import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaturityRating, type ProfileDto } from '@nova/shared';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, Length } from 'class-validator';

import { CurrentUser, type AuthenticatedUser } from '../../../common/presentation/decorators';
import {
  CreateProfileUseCase,
  DeleteProfileUseCase,
  ListProfilesUseCase,
  UpdateProfileUseCase,
} from '../application/manage-profiles.use-cases';

/** Body of `POST /profiles`. */
export class CreateProfileDto {
  @ApiProperty({ example: 'Anna' })
  @IsString()
  @Length(1, 24)
  public name!: string;

  @ApiPropertyOptional({ example: 'ember' })
  @IsOptional()
  @IsString()
  public avatarKey?: string;

  @ApiPropertyOptional({ default: false, description: 'Gyermekprofil létrehozása.' })
  @IsOptional()
  @IsBoolean()
  public isKids?: boolean;

  @ApiPropertyOptional({ example: 'hu' })
  @IsOptional()
  @IsIn(['hu', 'en', 'de', 'es', 'fr'])
  public language?: string;

  @ApiPropertyOptional({ enum: MaturityRating })
  @IsOptional()
  @IsEnum(MaturityRating)
  public maturityLevel?: MaturityRating;
}

/** Body of `PATCH /profiles/:id`. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Anna' })
  @IsOptional()
  @IsString()
  @Length(1, 24)
  public name?: string;

  @ApiPropertyOptional({ example: 'lagoon' })
  @IsOptional()
  @IsString()
  public avatarKey?: string;

  @ApiPropertyOptional({ example: 'hu' })
  @IsOptional()
  @IsIn(['hu', 'en', 'de', 'es', 'fr'])
  public language?: string;

  @ApiPropertyOptional({ enum: MaturityRating })
  @IsOptional()
  @IsEnum(MaturityRating)
  public maturityLevel?: MaturityRating;

  @ApiPropertyOptional({ description: 'Következő epizód automatikus indítása.' })
  @IsOptional()
  @IsBoolean()
  public autoplayNextEpisode?: boolean;

  @ApiPropertyOptional({ description: 'Előzetesek automatikus lejátszása böngészés közben.' })
  @IsOptional()
  @IsBoolean()
  public autoplayPreviews?: boolean;
}

/** Viewing profile endpoints (profile gate, editor, parental controls). */
@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  /**
   * @param listProfiles - Listing use case.
   * @param createProfile - Creation use case.
   * @param updateProfile - Update use case.
   * @param deleteProfile - Deletion use case.
   */
  public constructor(
    private readonly listProfiles: ListProfilesUseCase,
    private readonly createProfile: CreateProfileUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly deleteProfile: DeleteProfileUseCase,
  ) {}

  /**
   * @param caller - Authenticated account.
   * @returns Every profile of the account.
   */
  @Get()
  @ApiOperation({ summary: 'A fiók profiljainak listája' })
  public async list(@CurrentUser() caller: AuthenticatedUser): Promise<ProfileDto[]> {
    return this.listProfiles.execute(caller.userId);
  }

  /**
   * @param caller - Authenticated account.
   * @param dto - New profile settings.
   * @returns The created profile.
   */
  @Post()
  @ApiOperation({ summary: 'Új profil létrehozása' })
  public async create(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: CreateProfileDto,
  ): Promise<ProfileDto> {
    return this.createProfile.execute(caller.userId, dto);
  }

  /**
   * @param caller - Authenticated account.
   * @param id - Profile identifier.
   * @param dto - Fields to change.
   * @returns The updated profile.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Profil módosítása' })
  public async update(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return this.updateProfile.execute(caller.userId, id, dto);
  }

  /**
   * @param caller - Authenticated account.
   * @param id - Profile identifier.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Profil törlése' })
  public async remove(
    @CurrentUser() caller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteProfile.execute(caller.userId, id);
  }
}
