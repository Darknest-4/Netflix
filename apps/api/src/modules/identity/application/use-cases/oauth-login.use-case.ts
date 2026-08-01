import { Inject, Injectable } from '@nestjs/common';
import { ACCESS_TOKEN_TTL_SECONDS, type AuthResultDto, type OAuthProfileDto } from '@nova/shared';
import { randomBytes } from 'node:crypto';

import {
  CLOCK_PORT,
  EVENT_BUS_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type EventBusPort,
  type IdGeneratorPort,
} from '../../../../common/application/ports';
import { User } from '../../domain/user.entity';
import { USER_REPOSITORY, type UserRepository } from '../../domain/user.repository';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  type PasswordHasherPort,
  type TokenServicePort,
} from '../identity.ports';
import { UserMapper } from '../user.mapper';

/**
 * Signs a visitor in through a federated identity provider.
 *
 * Three cases are handled: an already linked identity, an existing local
 * account with the same verified address (the identity is linked to it), and a
 * brand new visitor (an account is provisioned with a random password).
 */
@Injectable()
export class OAuthLoginUseCase {
  /**
   * @param users - Account repository.
   * @param tokens - Token issuing port.
   * @param hasher - Password hashing port.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   * @param eventBus - Domain event publisher.
   */
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * @param profile - Normalised provider profile.
   * @returns Authentication result with a fresh token pair.
   */
  public async execute(profile: OAuthProfileDto): Promise<AuthResultDto> {
    const now = this.clock.now();

    let user = await this.users.findByOAuthAccount(profile.provider, profile.providerAccountId);

    if (!user) {
      user = await this.users.findByEmail(User.normaliseEmail(profile.email));

      if (!user) {
        user = User.create({
          id: this.ids.generate(),
          email: profile.email,
          displayName: profile.displayName,
          // Federated accounts get an unusable random password.
          passwordHash: await this.hasher.hash(randomBytes(32).toString('hex')),
          now,
        });
        user.verifyEmail();
        await this.users.save(user);

        await this.eventBus.publish('user.registered', {
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          plan: 'STANDARD',
        });
      }

      await this.users.linkOAuthAccount(user.id, profile.provider, profile.providerAccountId);
    }

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
      userAgent: `oauth:${profile.provider}`,
      expiresAt: new Date(now.getTime() + 30 * 24 * 3_600_000),
      revokedAt: null,
    });

    return {
      twoFactorRequired: false,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: UserMapper.toDto(user),
    };
  }
}
