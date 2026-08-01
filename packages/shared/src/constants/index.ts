import { MaturityRating, PlanTier } from '../enums';
import type { PlanDto } from '../types/billing';

/** Public brand name. Kept in one place so white-labelling is a single edit. */
export const BRAND_NAME = 'NOVA';

/** Marketing strapline used on the landing page and in e-mails. */
export const BRAND_TAGLINE = 'Végtelen történet. Egyetlen előfizetés.';

/** Maximum number of viewing profiles an account may own. */
export const MAX_PROFILES_PER_ACCOUNT = 5;

/** Minimum accepted password length; enforced on both client and server. */
export const MIN_PASSWORD_LENGTH = 10;

/** Access token lifetime in seconds (15 minutes). */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Refresh token lifetime in seconds (30 days). */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Progress above this percentage marks an episode or movie as finished. */
export const COMPLETION_THRESHOLD_PERCENT = 95;

/** Rows longer than this are truncated by the recommendation engine. */
export const MAX_ROW_ITEMS = 20;

/** Catalog genres offered by the browse navigation and the CMS. */
export const GENRES = [
  'Akció',
  'Kaland',
  'Animáció',
  'Vígjáték',
  'Bűnügyi',
  'Dokumentumfilm',
  'Dráma',
  'Családi',
  'Fantasy',
  'Történelmi',
  'Horror',
  'Misztikus',
  'Romantikus',
  'Sci-Fi',
  'Thriller',
  'Ismeretterjesztő',
] as const;
export type Genre = (typeof GENRES)[number];

/** Mood tags powering the "hangulat" filters and affinity scoring. */
export const MOODS = [
  'Feszült',
  'Szívmelengető',
  'Elgondolkodtató',
  'Látványos',
  'Sötét tónusú',
  'Könnyed',
  'Epikus',
  'Nosztalgikus',
] as const;
export type Mood = (typeof MOODS)[number];

/** Human readable labels for the maturity ratings. */
export const MATURITY_LABELS: Record<MaturityRating, string> = {
  [MaturityRating.ALL]: 'Korhatár nélkül',
  [MaturityRating.SEVEN_PLUS]: '7+',
  [MaturityRating.TWELVE_PLUS]: '12+',
  [MaturityRating.SIXTEEN_PLUS]: '16+',
  [MaturityRating.EIGHTEEN_PLUS]: '18+',
};

/** Numeric weight of each rating, used when comparing profile restrictions. */
export const MATURITY_WEIGHT: Record<MaturityRating, number> = {
  [MaturityRating.ALL]: 0,
  [MaturityRating.SEVEN_PLUS]: 7,
  [MaturityRating.TWELVE_PLUS]: 12,
  [MaturityRating.SIXTEEN_PLUS]: 16,
  [MaturityRating.EIGHTEEN_PLUS]: 18,
};

/** Highest rating a kids profile may ever see. */
export const KIDS_MAX_MATURITY: MaturityRating = MaturityRating.SEVEN_PLUS;

/** Catalogue of purchasable plans. */
export const PLANS: readonly PlanDto[] = [
  {
    tier: PlanTier.BASIC,
    name: 'Alap',
    priceMinor: 249_000,
    currency: 'HUF',
    maxStreams: 1,
    maxProfiles: 2,
    maxQuality: '720p',
    downloadsPerAccount: 20,
    features: ['1 eszközön egyszerre', 'HD-ig', 'Reklámmentes', 'Bármikor lemondható'],
    stripePriceId: 'price_nova_basic_monthly',
  },
  {
    tier: PlanTier.STANDARD,
    name: 'Standard',
    priceMinor: 399_000,
    currency: 'HUF',
    maxStreams: 2,
    maxProfiles: 5,
    maxQuality: '1080p',
    downloadsPerAccount: 50,
    features: [
      '2 eszközön egyszerre',
      'Full HD',
      'Reklámmentes',
      'Offline letöltés',
      'Bármikor lemondható',
    ],
    stripePriceId: 'price_nova_standard_monthly',
  },
  {
    tier: PlanTier.PREMIUM,
    name: 'Prémium',
    priceMinor: 599_000,
    currency: 'HUF',
    maxStreams: 4,
    maxProfiles: 5,
    maxQuality: '4K + HDR',
    downloadsPerAccount: 100,
    features: [
      '4 eszközön egyszerre',
      '4K + HDR',
      'Térhatású hang',
      'Offline letöltés',
      'Bármikor lemondható',
    ],
    stripePriceId: 'price_nova_premium_monthly',
  },
] as const;

/** Generated avatar presets — each key maps to a deterministic gradient. */
export const AVATAR_PRESETS = [
  'nebula',
  'aurora',
  'ember',
  'lagoon',
  'violet',
  'citrus',
  'mint',
  'cosmos',
] as const;
export type AvatarKey = (typeof AVATAR_PRESETS)[number];

/** Languages offered for audio and subtitle tracks. */
export const LANGUAGES = [
  { code: 'hu', label: 'Magyar' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
] as const;

/** Every REST path exposed by the API, in one typed map. */
export const API_ROUTES = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    twoFactorSetup: '/auth/2fa/setup',
    twoFactorEnable: '/auth/2fa/enable',
    twoFactorDisable: '/auth/2fa/disable',
    oauth: (provider: string) => `/auth/oauth/${provider}`,
  },
  profiles: {
    list: '/profiles',
    create: '/profiles',
    byId: (id: string) => `/profiles/${id}`,
  },
  catalog: {
    browse: '/catalog/browse',
    titles: '/catalog/titles',
    titleBySlug: (slug: string) => `/catalog/titles/${slug}`,
    genres: '/catalog/genres',
    newAndPopular: '/catalog/new-and-popular',
    topTen: '/catalog/top-ten',
    search: '/catalog/search',
  },
  watchlist: {
    list: (profileId: string) => `/profiles/${profileId}/watchlist`,
    toggle: (profileId: string, titleId: string) => `/profiles/${profileId}/watchlist/${titleId}`,
  },
  playback: {
    manifest: '/playback/manifest',
    progress: '/playback/progress',
    continueWatching: (profileId: string) => `/playback/continue-watching/${profileId}`,
  },
  billing: {
    plans: '/billing/plans',
    checkout: '/billing/checkout',
    subscription: '/billing/subscription',
    invoices: '/billing/invoices',
    webhook: '/billing/webhook',
  },
  notifications: {
    list: '/notifications',
    read: (id: string) => `/notifications/${id}/read`,
    pushSubscribe: '/notifications/push/subscribe',
  },
  admin: {
    stats: '/admin/stats',
    users: '/admin/users',
    titles: '/admin/titles',
    titleById: (id: string) => `/admin/titles/${id}`,
    subscriptions: '/admin/subscriptions',
  },
} as const;
