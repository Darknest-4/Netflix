import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { createHash, randomBytes } from 'node:crypto';
import { BRAND_NAME } from '@nova/shared';

import type { PasswordHasherPort, TokenServicePort, TotpPort } from '../../application/identity.ports';

/** bcrypt implementation of {@link PasswordHasherPort}. */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  /**
   * @param rounds - Cost factor; 10-12 is the production range.
   */
  public constructor(private readonly rounds: number) {}

  /** @inheritdoc */
  public async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  /** @inheritdoc */
  public async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

/** JWT implementation of {@link TokenServicePort}. */
@Injectable()
export class JwtTokenService implements TokenServicePort {
  /**
   * @param jwt - Nest JWT service.
   * @param config - Signing secrets and lifetimes.
   */
  public constructor(
    private readonly jwt: JwtService,
    private readonly config: {
      accessSecret: string;
      refreshSecret: string;
      accessTtlSeconds: number;
      refreshTtlSeconds: number;
    },
  ) {}

  /** @inheritdoc */
  public async signAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
  }): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.accessSecret,
      expiresIn: this.config.accessTtlSeconds,
    });
  }

  /** @inheritdoc */
  public async signRefreshToken(payload: { sub: string; jti: string }): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.refreshSecret,
      expiresIn: this.config.refreshTtlSeconds,
    });
  }

  /** @inheritdoc */
  public async verifyRefreshToken(token: string): Promise<{ sub: string; jti: string }> {
    return this.jwt.verifyAsync<{ sub: string; jti: string }>(token, {
      secret: this.config.refreshSecret,
    });
  }

  /** @inheritdoc */
  public hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

/** otplib implementation of {@link TotpPort} (RFC 6238, 30 s window). */
@Injectable()
export class OtplibTotpService implements TotpPort {
  public constructor() {
    // One step of drift tolerance covers clocks that are slightly out of sync.
    authenticator.options = { window: 1 };
  }

  /** @inheritdoc */
  public generateSecret(): string {
    return authenticator.generateSecret();
  }

  /** @inheritdoc */
  public buildOtpauthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, BRAND_NAME, secret);
  }

  /** @inheritdoc */
  public verify(code: string, secret: string): boolean {
    if (!secret || !/^\d{6}$/.test(code.trim())) {
      return false;
    }
    try {
      return authenticator.verify({ token: code.trim(), secret });
    } catch {
      return false;
    }
  }

  /** @inheritdoc */
  public generateRecoveryCodes(count: number): string[] {
    return Array.from({ length: count }, () =>
      randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-'),
    );
  }
}
