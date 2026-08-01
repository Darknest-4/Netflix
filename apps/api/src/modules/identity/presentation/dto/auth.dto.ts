import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanTier } from '@nova/shared';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

/** Body of `POST /auth/register`. */
export class RegisterDto {
  @ApiProperty({ example: 'nezo@example.com' })
  @IsEmail({}, { message: 'Érvénytelen e-mail cím.' })
  public email!: string;

  @ApiProperty({ example: 'ErosJelszo2026!', minLength: 10 })
  @IsString()
  @MinLength(10, { message: 'A jelszó legalább 10 karakter legyen.' })
  public password!: string;

  @ApiProperty({ example: 'Kovács Anna' })
  @IsString()
  @Length(2, 60)
  public displayName!: string;

  @ApiPropertyOptional({ enum: PlanTier, default: PlanTier.STANDARD })
  @IsOptional()
  @IsEnum(PlanTier)
  public plan?: PlanTier;
}

/** Body of `POST /auth/login`. */
export class LoginDto {
  @ApiProperty({ example: 'demo@nova.example' })
  @IsEmail({}, { message: 'Érvénytelen e-mail cím.' })
  public email!: string;

  @ApiProperty({ example: 'NovaDemo2026!' })
  @IsString()
  @MinLength(1)
  public password!: string;

  @ApiPropertyOptional({ example: '123456', description: 'TOTP kód, ha a fiókon aktív a 2FA.' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9A-Z-]{6,14}$/, { message: 'Érvénytelen hitelesítési kód.' })
  public totpCode?: string;
}

/** Body of `POST /auth/refresh` and `POST /auth/logout`. */
export class RefreshDto {
  @ApiProperty({ description: 'A bejelentkezéskor kapott refresh token.' })
  @IsString()
  @MinLength(20)
  public refreshToken!: string;
}

/** Body of `POST /auth/2fa/enable`. */
export class EnableTwoFactorDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'A kód 6 számjegyből áll.' })
  public code!: string;

  @ApiProperty({ type: [String], description: 'A setup lépésben kapott helyreállítási kódok.' })
  public recoveryCodes!: string[];
}

/** Body of `POST /auth/2fa/disable`. */
export class DisableTwoFactorDto {
  @ApiProperty({ description: 'Megerősítésként újra be kell írni a jelszót.' })
  @IsString()
  @MinLength(1)
  public password!: string;
}

/** Body of the demo OAuth callback (`POST /auth/oauth/:provider`). */
export class OAuthCallbackDto {
  @ApiProperty({ example: 'auth-code-from-provider' })
  @IsString()
  public code!: string;

  @ApiPropertyOptional({ example: 'nezo@example.com' })
  @IsOptional()
  @IsEmail()
  public email?: string;

  @ApiPropertyOptional({ example: 'Kovács Anna' })
  @IsOptional()
  @IsString()
  public displayName?: string;
}
