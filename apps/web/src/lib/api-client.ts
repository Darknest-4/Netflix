import type { ApiErrorDto, ApiResponse } from '@nova/shared';

/** Base URL of the API, configurable per environment. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Error thrown by {@link apiFetch} for any non-2xx response. */
export class ApiError extends Error {
  /**
   * @param status - HTTP status code.
   * @param code - Machine readable error code from the API.
   * @param message - User-safe message.
   * @param details - Optional structured context.
   */
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Options accepted by {@link apiFetch} on top of the standard `RequestInit`. */
export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** JSON-serialisable request body. */
  body?: unknown;
  /** Bearer token; omitted for public endpoints. */
  token?: string | null;
  /** Next.js fetch cache hints for server components. */
  next?: { revalidate?: number; tags?: string[] };
}

/**
 * Performs a typed API call and unwraps the `{ data }` envelope.
 *
 * The single entry point for every network call in the app: it centralises the
 * base URL, JSON handling, bearer authentication and error normalisation.
 *
 * @param path - Path relative to the API base, e.g. `/catalog/top-ten`.
 * @param options - Body, token and fetch options.
 * @returns The unwrapped response payload.
 * @throws {ApiError} When the API responds with a non-2xx status.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, token, headers, next, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(next ? { next } : {}),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiResponse<T> | ApiErrorDto) : null;

  if (!response.ok) {
    const error = payload as ApiErrorDto | null;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'A kérés nem teljesíthető.',
      error?.details,
    );
  }

  return (payload as ApiResponse<T>).data;
}

/**
 * Server-side fetch that never throws.
 *
 * Used by server components so a temporarily unavailable API degrades into an
 * empty state instead of a 500 page.
 *
 * @param path - Path relative to the API base.
 * @param fallback - Value returned when the call fails.
 * @param revalidate - ISR revalidation window in seconds.
 * @returns The payload, or the fallback.
 */
export async function safeServerFetch<T>(
  path: string,
  fallback: T,
  revalidate = 60,
): Promise<T> {
  try {
    return await apiFetch<T>(path, { next: { revalidate } });
  } catch {
    return fallback;
  }
}
