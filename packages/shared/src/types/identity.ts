import type { MaturityRating, PlanTier, SubscriptionStatus, UserRole } from '../enums';

/** Account representation that is safe to expose over the API. */
export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  subscription: SubscriptionSummaryDto | null;
}

/** Condensed subscription state embedded into the user payload. */
export interface SubscriptionSummaryDto {
  id: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/** A viewing profile owned by an account (up to `MAX_PROFILES_PER_ACCOUNT`). */
export interface ProfileDto {
  id: string;
  userId: string;
  name: string;
  /** Identifier of the generated avatar artwork (see `AVATAR_PRESETS`). */
  avatarKey: string;
  isKids: boolean;
  language: string;
  maturityLevel: MaturityRating;
  autoplayNextEpisode: boolean;
  autoplayPreviews: boolean;
  hasPin: boolean;
  createdAt: string;
}

/** Credentials submitted by the login form. */
export interface LoginRequestDto {
  email: string;
  password: string;
  /** Six digit TOTP code, required when the account has 2FA enabled. */
  totpCode?: string;
}

/** Payload accepted by the registration endpoint. */
export interface RegisterRequestDto {
  email: string;
  password: string;
  displayName: string;
  plan?: PlanTier;
}

/**
 * Successful authentication result.
 *
 * When `twoFactorRequired` is true the tokens are omitted and the client must
 * re-submit the login request together with a TOTP code.
 */
export interface AuthResultDto {
  twoFactorRequired: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number;
  user: UserDto | null;
}

/** Enrolment payload returned when a user starts 2FA setup. */
export interface TwoFactorSetupDto {
  secret: string;
  otpauthUrl: string;
  recoveryCodes: string[];
}

/** Supported third party identity providers. */
export type OAuthProvider = 'google' | 'github';

/** Normalised profile returned by an OAuth provider callback. */
export interface OAuthProfileDto {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  displayName: string;
}
