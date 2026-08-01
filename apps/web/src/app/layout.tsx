import type { Metadata, Viewport } from 'next';
import { BRAND_NAME, BRAND_TAGLINE } from '@nova/shared';

import './globals.css';
import { SessionProvider } from '@/providers/SessionProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';

/** Canonical site URL used for absolute metadata URLs. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Default document metadata.
 *
 * Page-level metadata (title templates, canonical URLs, Open Graph) is merged
 * on top of this in each route segment.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    'A NOVA streaming platform: saját gyártású sorozatok és filmek, több profil, gyermekbarát mód, 4K + HDR, bármikor lemondható előfizetés.',
  applicationName: BRAND_NAME,
  manifest: '/manifest.webmanifest',
  keywords: ['streaming', 'sorozatok', 'filmek', 'NOVA', 'online mozi', '4K', 'HDR'],
  authors: [{ name: `${BRAND_NAME} Streaming` }],
  openGraph: {
    type: 'website',
    locale: 'hu_HU',
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: 'Saját gyártású sorozatok, filmek és dokumentumfilmek egyetlen előfizetéssel.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: 'Saját gyártású sorozatok, filmek és dokumentumfilmek egyetlen előfizetéssel.',
  },
  robots: { index: true, follow: true },
};

/** Viewport and theme colour configuration. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08080b' },
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
  ],
};

/**
 * Root layout.
 *
 * Installs the provider stack (theme, session, toasts), the skip link and the
 * service worker registration used by the PWA.
 *
 * @param props.children - Routed page content.
 * @returns The document shell.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="hu" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-dvh">
        <a href="#main" className="skip-link">
          Ugrás a tartalomra
        </a>
        <ThemeProvider>
          <ToastProvider>
            <SessionProvider>
              <div id="main">{children}</div>
            </SessionProvider>
          </ToastProvider>
        </ThemeProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
