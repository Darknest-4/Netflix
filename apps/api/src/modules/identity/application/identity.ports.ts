/** Password hashing port — keeps bcrypt/argon out of the use cases. */
export interface PasswordHasherPort {
  /**
   * Derives a storable hash.
   *
   * @param plain - Plain text password.
   * @returns The derived hash.
   */
  hash(plain: string): Promise<string>;

  /**
   * Verifies a password against a stored hash in constant time.
   *
   * @param plain - Candidate password.
   * @param hash - Stored hash.
   * @returns True on a match.
   */
  compare(plain: string, hash: string): Promise<boolean>;
}

/** Access/refresh token issuing port. */
export interface TokenServicePort {
  /**
   * Signs a short lived access token.
   *
   * @param payload - Claims embedded into the token.
   * @returns Signed JWT.
   */
  signAccessToken(payload: { sub: string; email: string; role: string }): Promise<string>;

  /**
   * Signs a long lived refresh token.
   *
   * @param payload - Claims embedded into the token.
   * @returns Signed JWT.
   */
  signRefreshToken(payload: { sub: string; jti: string }): Promise<string>;

  /**
   * Verifies a refresh token signature and expiry.
   *
   * @param token - Raw refresh token.
   * @returns The decoded claims.
   */
  verifyRefreshToken(token: string): Promise<{ sub: string; jti: string }>;

  /**
   * Hashes a token for storage (raw tokens are never persisted).
   *
   * @param token - Raw token.
   * @returns SHA-256 hex digest.
   */
  hashToken(token: string): string;
}

/** Time-based one-time password port (RFC 6238). */
export interface TotpPort {
  /** @returns A fresh base32 shared secret. */
  generateSecret(): string;

  /**
   * Builds the `otpauth://` URI rendered as a QR code by the client.
   *
   * @param email - Account label shown in the authenticator app.
   * @param secret - Shared secret.
   * @returns The provisioning URI.
   */
  buildOtpauthUrl(email: string, secret: string): string;

  /**
   * Validates a six digit code against the shared secret.
   *
   * @param code - Code entered by the user.
   * @param secret - Shared secret.
   * @returns True when the code is currently valid.
   */
  verify(code: string, secret: string): boolean;

  /**
   * Generates single-use recovery codes.
   *
   * @param count - How many codes to generate.
   * @returns Upper-cased recovery codes.
   */
  generateRecoveryCodes(count: number): string[];
}

/** Injection token of {@link PasswordHasherPort}. */
export const PASSWORD_HASHER = Symbol('PasswordHasherPort');

/** Injection token of {@link TokenServicePort}. */
export const TOKEN_SERVICE = Symbol('TokenServicePort');

/** Injection token of {@link TotpPort}. */
export const TOTP_SERVICE = Symbol('TotpPort');
