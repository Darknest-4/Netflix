import { Inject, Injectable } from '@nestjs/common';
import type { TwoFactorSetupDto } from '@nova/shared';

import { BusinessRuleViolation, EntityNotFound } from '../../../../common/domain/domain.exceptions';
import { USER_REPOSITORY, type UserRepository } from '../../domain/user.repository';
import {
  PASSWORD_HASHER,
  TOTP_SERVICE,
  type PasswordHasherPort,
  type TotpPort,
} from '../identity.ports';

/**
 * Starts two-factor enrolment.
 *
 * Generates a shared secret and stages it on the aggregate. 2FA only becomes
 * active once {@link EnableTwoFactorUseCase} verifies a code, which prevents a
 * user from locking themselves out with a mis-scanned QR code.
 */
@Injectable()
export class SetupTwoFactorUseCase {
  /**
   * @param users - Account repository.
   * @param totp - TOTP port.
   */
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOTP_SERVICE) private readonly totp: TotpPort,
  ) {}

  /**
   * @param userId - Account starting the enrolment.
   * @returns Secret, provisioning URI and one-time recovery codes.
   * @throws {EntityNotFound} When the account no longer exists.
   */
  public async execute(userId: string): Promise<TwoFactorSetupDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFound('Felhasználó', userId);
    }

    const secret = this.totp.generateSecret();
    user.stageTwoFactorSecret(secret);
    await this.users.save(user);

    return {
      secret,
      otpauthUrl: this.totp.buildOtpauthUrl(user.email, secret),
      recoveryCodes: this.totp.generateRecoveryCodes(8),
    };
  }
}

/** Confirms enrolment by verifying the first generated code. */
@Injectable()
export class EnableTwoFactorUseCase {
  /**
   * @param users - Account repository.
   * @param totp - TOTP port.
   */
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOTP_SERVICE) private readonly totp: TotpPort,
  ) {}

  /**
   * @param userId - Account completing the enrolment.
   * @param code - Six digit code from the authenticator app.
   * @param recoveryCodes - Codes shown during setup, stored on success.
   * @throws {BusinessRuleViolation} When the code does not verify.
   */
  public async execute(userId: string, code: string, recoveryCodes: string[]): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFound('Felhasználó', userId);
    }

    if (!user.twoFactorSecret || !this.totp.verify(code, user.twoFactorSecret)) {
      throw new BusinessRuleViolation('A megadott kód érvénytelen.');
    }

    user.enableTwoFactor(recoveryCodes.map((entry) => entry.toUpperCase()));
    await this.users.save(user);
  }
}

/** Removes two-factor authentication after a password re-check. */
@Injectable()
export class DisableTwoFactorUseCase {
  /**
   * @param users - Account repository.
   * @param hasher - Password hashing port.
   */
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
  ) {}

  /**
   * @param userId - Account disabling 2FA.
   * @param password - Current password, re-entered as confirmation.
   * @throws {BusinessRuleViolation} When the password does not match.
   */
  public async execute(userId: string, password: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new EntityNotFound('Felhasználó', userId);
    }

    if (!(await this.hasher.compare(password, user.passwordHash))) {
      throw new BusinessRuleViolation('A megadott jelszó helytelen.');
    }

    user.disableTwoFactor();
    await this.users.save(user);
  }
}
