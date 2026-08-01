import type { MetadataRoute } from 'next';

/** Canonical site URL. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * `robots.txt` generator.
 *
 * The member area, the player and the admin panel are excluded: they are
 * personalised, require a session and must never appear in search results.
 *
 * @returns The robots document.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/title/', '/new'],
        disallow: ['/browse', '/watch/', '/admin', '/account', '/profiles', '/my-list', '/search'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
