import { Injectable } from '@nestjs/common';
import { UserRole } from '@nova/shared';
import * as bcrypt from 'bcryptjs';

import { User } from '../../domain/user.entity';
import type { RefreshTokenRecord, UserRepository } from '../../domain/user.repository';

/**
 * In-process account repository.
 *
 * Active when no `DATABASE_URL` is configured. It ships two demo accounts so
 * the whole product — including the admin panel — is explorable right after
 * `npm run dev`, with no database and no seeding step.
 */
@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();
  private readonly oauthLinks = new Map<string, string>();
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();

  public constructor() {
    this.seedDemoAccounts();
  }

  /** @inheritdoc */
  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  /** @inheritdoc */
  public async findByEmail(email: string): Promise<User | null> {
    const normalised = User.normaliseEmail(email);
    for (const user of this.users.values()) {
      if (user.email === normalised) {
        return user;
      }
    }
    return null;
  }

  /** @inheritdoc */
  public async findByOAuthAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<User | null> {
    const userId = this.oauthLinks.get(`${provider}:${providerAccountId}`);
    return userId ? (this.users.get(userId) ?? null) : null;
  }

  /** @inheritdoc */
  public async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  /** @inheritdoc */
  public async linkOAuthAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
  ): Promise<void> {
    this.oauthLinks.set(`${provider}:${providerAccountId}`, userId);
  }

  /** @inheritdoc */
  public async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    this.refreshTokens.set(record.tokenHash, record);
  }

  /** @inheritdoc */
  public async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.get(tokenHash) ?? null;
  }

  /** @inheritdoc */
  public async revokeRefreshToken(tokenHash: string): Promise<void> {
    const record = this.refreshTokens.get(tokenHash);
    if (record) {
      record.revokedAt = new Date();
    }
  }

  /** @inheritdoc */
  public async revokeAllRefreshTokens(userId: string): Promise<void> {
    for (const record of this.refreshTokens.values()) {
      if (record.userId === userId) {
        record.revokedAt = new Date();
      }
    }
  }

  /** @inheritdoc */
  public async list(params: {
    page: number;
    perPage: number;
    search?: string;
  }): Promise<{ items: User[]; total: number }> {
    const search = params.search?.toLowerCase().trim();
    const all = [...this.users.values()].filter(
      (user) =>
        !search ||
        user.email.includes(search) ||
        user.displayName.toLowerCase().includes(search),
    );
    const start = (params.page - 1) * params.perPage;
    return { items: all.slice(start, start + params.perPage), total: all.length };
  }

  /** @inheritdoc */
  public async count(): Promise<number> {
    return this.users.size;
  }

  /**
   * Creates the demo member and administrator.
   *
   * Credentials are printed in the README: `demo@nova.example / NovaDemo2026!`
   * and `admin@nova.example / NovaAdmin2026!`.
   */
  private seedDemoAccounts(): void {
    const now = new Date('2026-01-08T10:00:00.000Z');

    const member = User.rehydrate({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'demo@nova.example',
      displayName: 'Demo Néző',
      passwordHash: bcrypt.hashSync('NovaDemo2026!', 10),
      role: UserRole.MEMBER,
      emailVerified: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      recoveryCodes: [],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });

    const admin = User.rehydrate({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'admin@nova.example',
      displayName: 'NOVA Admin',
      passwordHash: bcrypt.hashSync('NovaAdmin2026!', 10),
      role: UserRole.ADMIN,
      emailVerified: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      recoveryCodes: [],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });

    this.users.set(member.id, member);
    this.users.set(admin.id, admin);
  }
}
