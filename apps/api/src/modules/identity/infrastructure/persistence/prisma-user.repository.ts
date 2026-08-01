import { Injectable } from '@nestjs/common';
import type { User as PrismaUser } from '@prisma/client';
import type { UserRole } from '@nova/shared';

import { PrismaService } from '../../../../common/infrastructure/persistence/prisma.service';
import { User } from '../../domain/user.entity';
import type { RefreshTokenRecord, UserRepository } from '../../domain/user.repository';

/**
 * PostgreSQL backed account repository.
 *
 * The mapping between rows and aggregates lives here and nowhere else, which is
 * what allows the domain to stay ignorant of Prisma.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  /**
   * @param prisma - Connection handle.
   */
  public constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  public async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? PrismaUserRepository.toDomain(row) : null;
  }

  /** @inheritdoc */
  public async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: User.normaliseEmail(email) } });
    return row ? PrismaUserRepository.toDomain(row) : null;
  }

  /** @inheritdoc */
  public async findByOAuthAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<User | null> {
    const link = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
    return link ? PrismaUserRepository.toDomain(link.user) : null;
  }

  /** @inheritdoc */
  public async save(user: User): Promise<void> {
    const snapshot = user.snapshot();
    await this.prisma.user.upsert({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        email: snapshot.email,
        displayName: snapshot.displayName,
        passwordHash: snapshot.passwordHash,
        role: snapshot.role,
        emailVerified: snapshot.emailVerified,
        twoFactorEnabled: snapshot.twoFactorEnabled,
        twoFactorSecret: snapshot.twoFactorSecret,
        recoveryCodes: snapshot.recoveryCodes,
        createdAt: snapshot.createdAt,
        lastLoginAt: snapshot.lastLoginAt,
      },
      update: {
        email: snapshot.email,
        displayName: snapshot.displayName,
        passwordHash: snapshot.passwordHash,
        role: snapshot.role,
        emailVerified: snapshot.emailVerified,
        twoFactorEnabled: snapshot.twoFactorEnabled,
        twoFactorSecret: snapshot.twoFactorSecret,
        recoveryCodes: snapshot.recoveryCodes,
        lastLoginAt: snapshot.lastLoginAt,
      },
    });
  }

  /** @inheritdoc */
  public async linkOAuthAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
  ): Promise<void> {
    await this.prisma.oAuthAccount.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: { userId, provider, providerAccountId },
      update: { userId },
    });
  }

  /** @inheritdoc */
  public async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: record.id,
        userId: record.userId,
        tokenHash: record.tokenHash,
        userAgent: record.userAgent,
        expiresAt: record.expiresAt,
      },
    });
  }

  /** @inheritdoc */
  public async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return row
      ? {
          id: row.id,
          userId: row.userId,
          tokenHash: row.tokenHash,
          userAgent: row.userAgent,
          expiresAt: row.expiresAt,
          revokedAt: row.revokedAt,
        }
      : null;
  }

  /** @inheritdoc */
  public async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  /** @inheritdoc */
  public async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** @inheritdoc */
  public async list(params: {
    page: number;
    perPage: number;
    search?: string;
  }): Promise<{ items: User[]; total: number }> {
    const where = params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: 'insensitive' as const } },
            { displayName: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: rows.map(PrismaUserRepository.toDomain), total };
  }

  /** @inheritdoc */
  public async count(): Promise<number> {
    return this.prisma.user.count();
  }

  /**
   * Maps a database row onto the domain aggregate.
   *
   * @param row - Prisma record.
   * @returns Rehydrated aggregate.
   */
  private static toDomain(row: PrismaUser): User {
    return User.rehydrate({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      passwordHash: row.passwordHash,
      role: row.role as UserRole,
      emailVerified: row.emailVerified,
      twoFactorEnabled: row.twoFactorEnabled,
      twoFactorSecret: row.twoFactorSecret,
      recoveryCodes: row.recoveryCodes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt,
    });
  }
}
