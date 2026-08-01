import type { User } from './user.entity';

/** Persisted refresh token record. */
export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
}

/**
 * Outbound port of the identity aggregate.
 *
 * The domain declares what it needs; `PrismaUserRepository` and
 * `InMemoryUserRepository` provide it.
 */
export interface UserRepository {
  /**
   * @param id - Account identifier.
   * @returns The aggregate, or `null` when unknown.
   */
  findById(id: string): Promise<User | null>;

  /**
   * @param email - Address in any casing.
   * @returns The aggregate, or `null` when unknown.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Looks up an account through a federated identity.
   *
   * @param provider - OAuth provider key.
   * @param providerAccountId - Stable id issued by the provider.
   * @returns The linked account, or `null`.
   */
  findByOAuthAccount(provider: string, providerAccountId: string): Promise<User | null>;

  /**
   * Inserts or updates an aggregate.
   *
   * @param user - Aggregate to persist.
   */
  save(user: User): Promise<void>;

  /**
   * Links a federated identity to an account.
   *
   * @param userId - Account identifier.
   * @param provider - OAuth provider key.
   * @param providerAccountId - Stable id issued by the provider.
   */
  linkOAuthAccount(userId: string, provider: string, providerAccountId: string): Promise<void>;

  /**
   * Stores a hashed refresh token.
   *
   * @param record - Token record to persist.
   */
  saveRefreshToken(record: RefreshTokenRecord): Promise<void>;

  /**
   * @param tokenHash - SHA-256 hash of the presented refresh token.
   * @returns The stored record, or `null`.
   */
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;

  /**
   * Revokes a single refresh token (logout on one device).
   *
   * @param tokenHash - SHA-256 hash of the token to revoke.
   */
  revokeRefreshToken(tokenHash: string): Promise<void>;

  /**
   * Revokes every refresh token of an account (logout everywhere).
   *
   * @param userId - Account identifier.
   */
  revokeAllRefreshTokens(userId: string): Promise<void>;

  /**
   * Paginated listing for the admin user table.
   *
   * @param params - Paging and free-text search parameters.
   * @returns Page of accounts plus the total count.
   */
  list(params: { page: number; perPage: number; search?: string }): Promise<{
    items: User[];
    total: number;
  }>;

  /** @returns Total number of registered accounts. */
  count(): Promise<number>;
}

/** Injection token of {@link UserRepository}. */
export const USER_REPOSITORY = Symbol('UserRepository');
