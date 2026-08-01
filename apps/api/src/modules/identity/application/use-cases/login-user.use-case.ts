import { Inject, Injectable } from '@nestjs/common';
import { ACCESS_TOKEN_TTL_SECONDS, type AuthResultDto } from '@nova/shared';

import {
  CLOCK_PORT,
  EVENT_BUS_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type EventBusPort,
  type IdGeneratorPort,
} from '../../../../common/application/ports';
import { AuthenticationFailed } from '../../../../common/domain/domain.exceptions';
import { User } from '../../domain/user.entity';
import { USER_REPOSITORY, type UserRepository } from '../../domain/user.repository';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  TOTP_SERVICE,
  type PasswordHasherPort,
  type TokenServicePort,
  type TotpPort,
} from '../identity.ports';
import { UserMapper } from '../user.mapper';

/** Input of {@link LoginUserUseCase}. */
export interface LoginCommand {
  email: string;
  password: string;
  totpCode?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Password (and optionally TOTP) based sign-in.
 *
 * The failure path is deliberately uniform — wrong address and wrong password
 * produce the same error and take a comparable amount of time — so the endpoint
 * cannot be used to enumerate accounts.
 */
@Injectable()
export class LoginUserUseCase {
  /**
   * @param users - Account repository.
   * @param hasher - Password hashing port.
   * @param tokens - Token issuing port.
   * @param totp - Two-factor port.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   * @param eventBus - Domain event publisher.
   */
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    @Inject(TOTP_SERVICE) private readonly totp: TotpPort,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Executes the sign-in.
   *
   * @param command - Credentials and device metadata.
   * @returns A token pair, or a `twoFactorRequired` challenge.
   * @throws {AuthenticationFailed} On invalid credentials or an invalid code.
   */
  public async execute(command: LoginCommand): Promise<AuthResultDto> {
    const user = await this.users.findByEmail(User.normaliseEmail(command.email));
    if (!user) {
      // Hash anyway: equalises the response time of unknown and known accounts.
      await this.hasher.hash(command.password);
      throw new AuthenticationFailed();
    }

    const passwordMatches = await this.hasher.compare(command.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AuthenticationFailed();
    }

    if (user.twoFactorEnabled) {
      if (!command.totpCode) {
        return {
          twoFactorRequired: true,
          accessToken: null,
          refreshToken: null,
          expiresIn: 0,
          user: null,
        };
      }

      const secret = user.twoFactorSecret ?? '';
      const codeValid =
        this.totp.verify(command.totpCode, secret) || user.consumeRecoveryCode(command.totpCode);

      if (!codeValid) {
        throw new AuthenticationFailed('Érvénytelen hitelesítési kód.');
      }
    }

    const now = this.clock.now();
    user.markLoggedIn(now);
    await this.users.save(user);

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const jti = this.ids.generate();
    const refreshToken = await this.tokens.signRefreshToken({ sub: user.id, jti });
    await this.users.saveRefreshToken({
      id: jti,
      userId: user.id,
      tokenHash: this.tokens.hashToken(refreshToken),
      userAgent: command.userAgent ?? null,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3_600_000),
      revokedAt: null,
    });

    await this.eventBus.publish('user.logged-in', { userId: user.id, at: now.toISOString() });

    return {
      twoFactorRequired: false,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: UserMapper.toDto(user),
    };
  }
}
