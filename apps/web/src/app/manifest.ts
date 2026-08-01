import type { MetadataRoute } from 'next';
import { BRAND_NAME, BRAND_TAGLINE } from '@nova/shared';

/**
 * Web app manifest.
 *
 * Makes the app installable on desktop and mobile, opening in standalone mode
 * with the brand colours applied to the OS chrome.
 *
 * @returns The manifest document.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    short_name: BRAND_NAME,
    description: 'Korlátlan sorozat, film és dokumentumfilm egyetlen előfizetéssel.',
    start_url: '/browse',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#08080b',
    theme_color: '#e11d2e',
    lang: 'hu',
    categories: ['entertainment', 'video'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Kezdőlap', url: '/browse' },
      { name: 'A listám', url: '/my-list' },
      { name: 'Keresés', url: '/search' },
    ],
  };
}
