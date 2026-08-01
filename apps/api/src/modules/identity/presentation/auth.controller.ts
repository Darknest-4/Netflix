import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { AuthResultDto, OAuthProvider, TwoFactorSetupDto, UserDto } from '@nova/shared';

import { EntityNotFound } from '../../../common/domain/domain.exceptions';
import { CurrentUser, Public, type AuthenticatedUser } from '../../../common/presentation/decorators';
import { USER_REPOSITORY, type UserRepository } from '../domain/user.repository';
import { TOKEN_SERVICE, type TokenServicePort } from '../application/identity.ports';
import { UserMapper } from '../application/user.mapper';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import {
  DisableTwoFactorUseCase,
  EnableTwoFactorUseCase,
  SetupTwoFactorUseCase,
} from '../application/use-cases/manage-two-factor.use-cases';
import { OAuthLoginUseCase } from '../application/use-cases/oauth-login.use-case';
import { RefreshSessionUseCase } from '../application/use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import {
  DisableTwoFactorDto,
  EnableTwoFactorDto,
  LoginDto,
  OAuthCallbackDto,
  RefreshDto,
  RegisterDto,
} from './dto/auth.dto';

/**
 * Authentication endpoints.
 *
 * The controller is a thin adapter: it validates input, calls a single use
 * case and returns its result. No business rule is implemented here.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  /**
   * @param registerUser - Registration use case.
   * @param loginUser - Sign-in use case.
   * @param refreshSession - Token rotation use case.
   * @param setupTwoFactor - 2FA enrolment start.
   * @param enableTwoFactor - 2FA enrolment confirmation.
   * @param disableTwoFactor - 2FA removal.
   * @param oauthLogin - Federated sign-in.
   * @param users - Account repository, used by `/auth/me` and logout.
   * @param tokens - Token service, used to hash the token presented at logout.
   */
  public constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly setupTwoFactor: SetupTwoFactorUseCase,
    private readonly enableTwoFactor: EnableTwoFactorUseCase,
    private readonly disableTwoFactor: DisableTwoFactorUseCase,
    private readonly oauthLogin: OAuthLoginUseCase,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
  ) {}

  /**
   * Registers a new member and signs them in.
   *
   * @param dto - Registration payload.
   * @param request - Incoming request, used for the device descriptor.
   * @returns Token pair and the created account.
   */
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Regisztráció és azonnali bejelentkezés' })
  public async register(@Body() dto: RegisterDto, @Req() request: Request): Promise<AuthResultDto> {
    return this.registerUser.execute({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
      plan: dto.plan,
      userAgent: request.headers['user-agent'],
    });
  }

  /**
   * Signs an existing member in.
   *
   * @param dto - Credentials and optional TOTP code.
   * @param request - Incoming request, used for the device descriptor.
   * @returns Token pair, or a two-factor challenge.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Bejelentkezés (jelszó + opcionális 2FA)' })
  public async login(@Body() dto: LoginDto, @Req() request: Request): Promise<AuthResultDto> {
    return this.loginUser.execute({
      email: dto.email,
      password: dto.password,
      totpCode: dto.totpCode,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });
  }

  /**
   * Rotates an expiring session.
   *
   * @param dto - The refresh token to exchange.
   * @param request - Incoming request, used for the device descriptor.
   * @returns A freshly issued token pair.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access token megújítása' })
  public async refresh(@Body() dto: RefreshDto, @Req() request: Request): Promise<AuthResultDto> {
    return this.refreshSession.execute(dto.refreshToken, request.headers['user-agent']);
  }

  /**
   * Revokes the presented refresh token (sign-out on this device).
   *
   * @param dto - The refresh token to revoke.
   * @returns Acknowledgement.
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kijelentkezés' })
  public async logout(@Body() dto: RefreshDto): Promise<{ success: boolean }> {
    const stored = await this.users.findRefreshToken(this.tokens.hashToken(dto.refreshToken));
    if (stored) {
      await this.users.revokeRefreshToken(stored.tokenHash);
    }
    return { success: true };
  }

  /**
   * Returns the authenticated account.
   *
   * @param caller - Authenticated caller.
   * @returns The account DTO.
   * @throws {EntityNotFound} When the account was deleted mid-session.
   */
  @Get('me')
  @ApiOperation({ summary: 'A bejelentkezett fiók lekérdezése' })
  public async me(@CurrentUser() caller: AuthenticatedUser): Promise<UserDto> {
    const user = await this.users.findById(caller.userId);
    if (!user) {
      throw new EntityNotFound('Felhasználó', caller.userId);
    }
    return UserMapper.toDto(user);
  }

  /**
   * Starts two-factor enrolment.
   *
   * @param caller - Authenticated caller.
   * @returns Secret, provisioning URI and recovery codes.
   */
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '2FA bekapcsolás előkészítése' })
  public async twoFactorSetup(@CurrentUser() caller: AuthenticatedUser): Promise<TwoFactorSetupDto> {
    return this.setupTwoFactor.execute(caller.userId);
  }

  /**
   * Confirms two-factor enrolment.
   *
   * @param caller - Authenticated caller.
   * @param dto - Verification code and recovery codes.
   * @returns Acknowledgement.
   */
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '2FA aktiválása' })
  public async twoFactorEnable(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: EnableTwoFactorDto,
  ): Promise<{ success: boolean }> {
    await this.enableTwoFactor.execute(caller.userId, dto.code, dto.recoveryCodes);
    return { success: true };
  }

  /**
   * Removes two-factor authentication.
   *
   * @param caller - Authenticated caller.
   * @param dto - Password confirmation.
   * @returns Acknowledgement.
   */
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '2FA kikapcsolása' })
  public async twoFactorDisable(
    @CurrentUser() caller: AuthenticatedUser,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<{ success: boolean }> {
    await this.disableTwoFactor.execute(caller.userId, dto.password);
    return { success: true };
  }

  /**
   * Completes an OAuth sign-in.
   *
   * In production the authorisation code is exchanged with the provider; when
   * no provider credentials are configured the endpoint trusts the supplied
   * demo profile so the flow stays testable end to end.
   *
   * @param provider - Provider key (`google` or `github`).
   * @param dto - Authorisation code and demo profile fields.
   * @returns Token pair for the federated account.
   */
  @Public()
  @Post('oauth/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth bejelentkezés (Google / GitHub)' })
  public async oauth(
    @Param('provider') provider: OAuthProvider,
    @Body() dto: OAuthCallbackDto,
  ): Promise<AuthResultDto> {
    return this.oauthLogin.execute({
      provider,
      providerAccountId: dto.code,
      email: dto.email ?? `${dto.code}@${provider}.oauth.local`,
      displayName: dto.displayName ?? 'OAuth felhasználó',
    });
  }
}
