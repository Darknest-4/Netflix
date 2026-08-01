import type { MetadataRoute } from 'next';
import { API_ROUTES, type PaginatedResponse, type TitleSummaryDto } from '@nova/shared';

import { safeServerFetch } from '@/lib/api-client';

/** Canonical site URL. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Sitemap generator.
 *
 * Lists the public marketing pages plus every published catalog entry, so the
 * detail pages are discoverable by search engines.
 *
 * @returns The sitemap entries.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await safeServerFetch<PaginatedResponse<TitleSummaryDto>>(
    `${API_ROUTES.catalog.titles}?perPage=100`,
    { data: [], meta: { page: 1, perPage: 100, total: 0, totalPages: 1 } },
    3600,
  );

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/new`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/signup`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/login`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  return [
    ...staticRoutes,
    ...catalog.data.map((title) => ({
      url: `${SITE_URL}/title/${title.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
