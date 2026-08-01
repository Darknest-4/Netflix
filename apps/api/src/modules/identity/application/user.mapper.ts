import type { UserDto } from '@nova/shared';

import type { User } from '../domain/user.entity';

/**
 * Translates the `User` aggregate into its API representation.
 *
 * The subscription slot is intentionally `null` here: billing is a separate
 * bounded context and the web client hydrates it from `/billing/subscription`,
 * which keeps the identity module free of billing dependencies.
 */
export class UserMapper {
  /**
   * @param user - Aggregate to expose.
   * @returns Wire-safe DTO without any secret material.
   */
  public static toDto(user: User): UserDto {
    const snapshot = user.snapshot();
    return {
      id: snapshot.id,
      email: snapshot.email,
      displayName: snapshot.displayName,
      role: snapshot.role,
      emailVerified: snapshot.emailVerified,
      twoFactorEnabled: snapshot.twoFactorEnabled,
      createdAt: snapshot.createdAt.toISOString(),
      subscription: null,
    };
  }
}
