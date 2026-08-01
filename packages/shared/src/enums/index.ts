/**
 * Enumerations shared by every NOVA runtime.
 *
 * They are modelled as frozen constant objects plus derived union types instead
 * of native TypeScript `enum`s: the resulting values are plain strings, which
 * keeps them serialisable over HTTP, storable in PostgreSQL and comparable in
 * both the NestJS API and the Next.js client without any runtime import.
 */

/** Kind of catalog entry. */
export const TitleKind = {
  MOVIE: 'MOVIE',
  SERIES: 'SERIES',
} as const;
export type TitleKind = (typeof TitleKind)[keyof typeof TitleKind];

/** Age classification used for parental controls and profile filtering. */
export const MaturityRating = {
  ALL: 'ALL',
  SEVEN_PLUS: 'SEVEN_PLUS',
  TWELVE_PLUS: 'TWELVE_PLUS',
  SIXTEEN_PLUS: 'SIXTEEN_PLUS',
  EIGHTEEN_PLUS: 'EIGHTEEN_PLUS',
} as const;
export type MaturityRating = (typeof MaturityRating)[keyof typeof MaturityRating];

/** Commercial plan a subscription is bound to. */
export const PlanTier = {
  BASIC: 'BASIC',
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
} as const;
export type PlanTier = (typeof PlanTier)[keyof typeof PlanTier];

/** Lifecycle state of a subscription, mirroring the payment provider states. */
export const SubscriptionStatus = {
  TRIALING: 'TRIALING',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
  INCOMPLETE: 'INCOMPLETE',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

/** Authorisation role attached to an account. */
export const UserRole = {
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Delivery channel of an outbound notification. */
export const NotificationChannel = {
  EMAIL: 'EMAIL',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

/** Adaptive streaming protocol offered for a playback session. */
export const StreamProtocol = {
  HLS: 'HLS',
  DASH: 'DASH',
} as const;
export type StreamProtocol = (typeof StreamProtocol)[keyof typeof StreamProtocol];

/** Visual layout of a catalog row on the browse page. */
export const RowLayout = {
  STANDARD: 'STANDARD',
  TOP_TEN: 'TOP_TEN',
  CONTINUE: 'CONTINUE',
  HERO_BILLBOARD: 'HERO_BILLBOARD',
} as const;
export type RowLayout = (typeof RowLayout)[keyof typeof RowLayout];

/** Reason a recommendation row was produced — surfaced for explainability. */
export const RecommendationReason = {
  TRENDING: 'TRENDING',
  BECAUSE_YOU_WATCHED: 'BECAUSE_YOU_WATCHED',
  GENRE_AFFINITY: 'GENRE_AFFINITY',
  NEW_RELEASE: 'NEW_RELEASE',
  TOP_TEN_LOCAL: 'TOP_TEN_LOCAL',
  CONTINUE_WATCHING: 'CONTINUE_WATCHING',
  MY_LIST: 'MY_LIST',
} as const;
export type RecommendationReason =
  (typeof RecommendationReason)[keyof typeof RecommendationReason];
