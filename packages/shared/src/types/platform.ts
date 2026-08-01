import type { NotificationChannel } from '../enums';

/** Envelope used by every non-paginated API response body. */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** Envelope used by list endpoints that support cursor-less offset paging. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

/** Shape emitted by the global exception filter. */
export interface ApiErrorDto {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
  requestId: string;
}

/** Notification delivered to a member. */
export interface NotificationDto {
  id: string;
  userId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  /** Deep link opened when the notification is activated. */
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Web Push subscription registered by the service worker. */
export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/** Aggregated KPIs rendered on the admin dashboard. */
export interface PlatformStatsDto {
  totalMembers: number;
  activeSubscriptions: number;
  monthlyRecurringRevenueMinor: number;
  currency: string;
  totalTitles: number;
  totalWatchHours: number;
  churnRatePercent: number;
  /** Signups per day for the trailing 30 days. */
  signupsTrend: TimeSeriesPointDto[];
  /** Watch hours per day for the trailing 30 days. */
  watchTrend: TimeSeriesPointDto[];
  topTitles: { titleId: string; name: string; views: number }[];
  planDistribution: { plan: string; count: number }[];
}

/** One point of a daily time series. */
export interface TimeSeriesPointDto {
  /** ISO date (`YYYY-MM-DD`). */
  date: string;
  value: number;
}

/** Events pushed over the realtime WebSocket gateway. */
export type RealtimeEvent =
  | { type: 'notification.created'; payload: NotificationDto }
  | { type: 'playback.progress'; payload: { profileId: string; titleId: string; percent: number } }
  | { type: 'catalog.updated'; payload: { titleId: string } }
  | { type: 'subscription.updated'; payload: { userId: string; status: string } };
