'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker that backs offline support and Web Push.
 *
 * Registration is deferred to the `load` event so it never competes with the
 * first render, and it is skipped entirely in development where the worker
 * would cache stale bundles.
 *
 * @returns Nothing; the component renders no markup.
 */
export function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    /** Registers the worker once the page has finished loading. */
    const register = (): void => {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
