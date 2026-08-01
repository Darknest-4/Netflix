'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * Route level error boundary.
 *
 * @param props.error - The thrown error.
 * @param props.reset - Re-renders the segment.
 * @returns The error screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  useEffect(() => {
    // In production this is where the error reporter (Sentry, OTel) is called.
    console.error('Váratlan hiba a felületen:', error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md space-y-5">
        <h1 className="text-3xl font-black tracking-tight">Valami félresiklott</h1>
        <p className="text-[var(--text-secondary)]">
          Váratlan hiba történt a lejátszás közben. Próbáld újra — ha ismétlődik, jelezd a
          támogatásnak.
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--text-muted)]">Hibaazonosító: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Újrapróbálom</Button>
          <Button href="/browse" variant="secondary">
            Kezdőlap
          </Button>
        </div>
      </div>
    </div>
  );
}
