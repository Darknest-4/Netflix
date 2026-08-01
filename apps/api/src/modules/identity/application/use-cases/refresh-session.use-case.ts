import { Inject, Injectable } from '@nestjs/common';
import { ACCESS_TOKEN_TTL_SECONDS, type AuthResultDto } from '@nova/shared';

import {
  CLOCK_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type IdGeneratorPort,
} from '../../../../common/application/ports';
import { AuthenticationFailed } from '../../../../common/domain/domain.exceptions';
import { USER_REPOSITORY, type UserRepository } from '../../domain/user.repository';
import { TOKEN_SERVICE, type TokenServicePort } from '../identity.ports';
import { UserMapper } from '../user.mapper';

/**
 * Exchanges a refresh token for a new token pair.
 *
 * Refresh tokens are rotated on every use and the previous one is revoked, so a
 * stolen token stops working as soon as the legitimate client refreshes.
 */
@Injectable()
export class RefreshSessionUseCase {
  /**
   * @param users - Account repository.
   * @param tokens - Token issuing port.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   */
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
  ) {}

  /**
   * Rotates the session.
   *
   * @param refreshToken - Raw refresh token presented by the client.
   * @param userAgent - Device descriptor stored with the new token.
   * @returns A freshly issued token pair.
   * @throws {AuthenticationFailed} When the token is unknown, revoked or expired.
   */
  public async execute(refreshToken: string, userAgent?: string): Promise<AuthResultDto> {
    let claims: { sub: string; jti: string };
    try {
      claims = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationFailed('A munkamenet lejárt, jelentkezz be újra.');
    }

    const stored = await this.users.findRefreshToken(this.tokens.hashToken(refreshToken));
    const now = this.clock.now();

    if (!stored || stored.revokedAt || stored.expiresAt <= now) {
      throw new AuthenticationFailed('A munkamenet lejárt, jelentkezz be újra.');
    }

    const user = await this.users.findById(claims.sub);
    if (!user) {
      throw new AuthenticationFailed();
    }

    await this.users.revokeRefreshToken(stored.tokenHash);

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const jti = this.ids.generate();
    const nextRefreshToken = await this.tokens.signRefreshToken({ sub: user.id, jti });
    await this.users.saveRefreshToken({
      id: jti,
      userId: user.id,
      tokenHash: this.tokens.hashToken(nextRefreshToken),
      userAgent: userAgent ?? stored.userAgent,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3_600_000),
      revokedAt: null,
    });

    return {
      twoFactorRequired: false,
      accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: UserMapper.toDto(user),
    };
  }
}
