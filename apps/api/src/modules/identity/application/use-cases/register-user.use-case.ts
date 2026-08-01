import { Inject, Injectable } from '@nestjs/common';
import {
  type AuthResultDto,
  type PlanTier,
  ACCESS_TOKEN_TTL_SECONDS,
  checkPassword,
  isValidEmail,
} from '@nova/shared';

import {
  CLOCK_PORT,
  EVENT_BUS_PORT,
  ID_GENERATOR_PORT,
  type ClockPort,
  type EventBusPort,
  type IdGeneratorPort,
} from '../../../../common/application/ports';
import { BusinessRuleViolation, ConflictError } from '../../../../common/domain/domain.exceptions';
import { User } from '../../domain/user.entity';
import { USER_REPOSITORY, type UserRepository } from '../../domain/user.repository';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  type PasswordHasherPort,
  type TokenServicePort,
} from '../identity.ports';
import { UserMapper } from '../user.mapper';

/** Input of {@link RegisterUserUseCase}. */
export interface RegisterUserCommand {
  email: string;
  password: string;
  displayName: string;
  plan?: PlanTier;
  userAgent?: string;
}

/**
 * Creates an account and immediately signs the visitor in.
 *
 * Side effects that belong to other bounded contexts (default profile, trial
 * subscription, welcome e-mail) are triggered through the `user.registered`
 * domain event rather than direct calls, so the modules stay independently
 * deployable.
 */
@Injectable()
export class RegisterUserUseCase {
  /**
   * @param users - Account repository.
   * @param hasher - Password hashing port.
   * @param tokens - Token issuing port.
   * @param ids - Identifier factory.
   * @param clock - Wall clock.
   * @param eventBus - Domain event publisher.
   */
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    @Inject(ID_GENERATOR_PORT) private readonly ids: IdGeneratorPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  /**
   * Executes the registration.
   *
   * @param command - Registration payload.
   * @returns Authentication result with a fresh token pair.
   * @throws {BusinessRuleViolation} On an invalid address or weak password.
   * @throws {ConflictError} When the address is already registered.
   */
  public async execute(command: RegisterUserCommand): Promise<AuthResultDto> {
    if (!isValidEmail(command.email)) {
      throw new BusinessRuleViolation('Érvénytelen e-mail cím.');
    }

    const policy = checkPassword(command.password);
    if (!policy.valid) {
      throw new BusinessRuleViolation(policy.issues.join(' '), { issues: policy.issues });
    }

    const existing = await this.users.findByEmail(User.normaliseEmail(command.email));
    if (existing) {
      throw new ConflictError('Ezzel az e-mail címmel már létezik fiók.');
    }

    const user = User.create({
      id: this.ids.generate(),
      email: command.email,
      displayName: command.displayName,
      passwordHash: await this.hasher.hash(command.password),
      now: this.clock.now(),
    });

    await this.users.save(user);

    await this.eventBus.publish('user.registered', {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      plan: command.plan ?? 'STANDARD',
    });

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
      expiresAt: new Date(this.clock.now().getTime() + 30 * 24 * 3_600_000),
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
