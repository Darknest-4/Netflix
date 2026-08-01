import { UserRole } from '@nova/shared';

import { BusinessRuleViolation } from '../../../common/domain/domain.exceptions';
import { User } from './user.entity';

/** Fixed instant so the tests never depend on the wall clock. */
const NOW = new Date('2026-01-01T00:00:00.000Z');

/**
 * Builds a valid aggregate for the tests.
 *
 * @param overrides - Fields to override.
 * @returns A new `User` aggregate.
 */
function makeUser(overrides: Partial<Parameters<typeof User.create>[0]> = {}): User {
  return User.create({
    id: 'user-1',
    email: 'Anna@Example.COM',
    displayName: 'Kovács Anna',
    passwordHash: 'hashed',
    now: NOW,
    ...overrides,
  });
}

describe('User aggregate', () => {
  describe('create', () => {
    it('normalises the e-mail address', () => {
      expect(makeUser().email).toBe('anna@example.com');
    });

    it('starts as an unverified member without 2FA', () => {
      const user = makeUser();
      expect(user.role).toBe(UserRole.MEMBER);
      expect(user.twoFactorEnabled).toBe(false);
      expect(user.snapshot().emailVerified).toBe(false);
    });

    it('rejects a display name shorter than two characters', () => {
      expect(() => makeUser({ displayName: 'A' })).toThrow(BusinessRuleViolation);
    });

    it('trims the display name', () => {
      expect(makeUser({ displayName: '  Anna  ' }).displayName).toBe('Anna');
    });
  });

  describe('two-factor enrolment', () => {
    it('cannot be enabled before a secret is staged', () => {
      expect(() => makeUser().enableTwoFactor(['CODE1'])).toThrow(BusinessRuleViolation);
    });

    it('activates once a secret is staged', () => {
      const user = makeUser();
      user.stageTwoFactorSecret('SECRET');
      user.enableTwoFactor(['CODE1', 'CODE2']);

      expect(user.twoFactorEnabled).toBe(true);
      expect(user.twoFactorSecret).toBe('SECRET');
    });

    it('clears the secret and the recovery codes when disabled', () => {
      const user = makeUser();
      user.stageTwoFactorSecret('SECRET');
      user.enableTwoFactor(['CODE1']);
      user.disableTwoFactor();

      expect(user.twoFactorEnabled).toBe(false);
      expect(user.twoFactorSecret).toBeNull();
      expect(user.snapshot().recoveryCodes).toHaveLength(0);
    });
  });

  describe('recovery codes', () => {
    it('accepts a code once and then invalidates it', () => {
      const user = makeUser();
      user.stageTwoFactorSecret('SECRET');
      user.enableTwoFactor(['ABCDE-12345']);

      expect(user.consumeRecoveryCode('abcde-12345')).toBe(true);
      expect(user.consumeRecoveryCode('abcde-12345')).toBe(false);
    });

    it('rejects an unknown code', () => {
      const user = makeUser();
      user.stageTwoFactorSecret('SECRET');
      user.enableTwoFactor(['ABCDE-12345']);

      expect(user.consumeRecoveryCode('NOPE')).toBe(false);
    });
  });

  it('records the last sign-in instant', () => {
    const user = makeUser();
    const loginAt = new Date('2026-02-02T10:00:00.000Z');
    user.markLoggedIn(loginAt);

    expect(user.snapshot().lastLoginAt).toEqual(loginAt);
  });
});
