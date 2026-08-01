'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { API_ROUTES, type SearchResultDto, type TitleSummaryDto } from '@nova/shared';

import { apiFetch } from '@/lib/api-client';
import { PreviewModal } from '@/components/catalog/PreviewModal';
import { TitleCard } from '@/components/catalog/TitleCard';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSession } from '@/providers/SessionProvider';

/**
 * Search results grid.
 *
 * Debounces the query so typing does not fan out one request per keystroke, and
 * respects the maturity level of the active profile.
 *
 * @returns The results element.
 */
function SearchResults(): React.JSX.Element {
  const params = useSearchParams();
  const { activeProfile } = useSession();
  const term = params.get('q') ?? '';

  const [results, setResults] = useState<SearchResultDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<TitleSummaryDto | null>(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ q: term });
      if (activeProfile) {
        query.set('maturityLevel', activeProfile.maturityLevel);
      }

      void apiFetch<SearchResultDto[]>(`${API_ROUTES.catalog.search}?${query.toString()}`)
        .then((found) => {
          if (!cancelled) {
            setResults(found);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, activeProfile]);

  return (
    <main className="min-h-dvh px-[var(--spacing-row-gutter)] pb-16 pt-28">
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
        {term ? `Találatok erre: „${term}”` : 'Keresés'}
      </h1>

      {loading && (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_unused, index) => (
            <Skeleton key={index} className="aspect-video" />
          ))}
        </div>
      )}

      {!loading && term.length >= 2 && results.length === 0 && (
        <p className="mt-10 max-w-lg text-[var(--text-secondary)]">
          Nincs találat. Próbálj másik címet, műfajt vagy színészt — például „thriller”, „Északi” vagy
          „dokumentumfilm”.
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-16 sm:grid-cols-4 lg:grid-cols-6">
          {results.map((result) => (
            <li key={result.title.id}>
              <TitleCard title={result.title} onPreview={setPreview} />
            </li>
          ))}
        </ul>
      )}

      <PreviewModal title={preview} onClose={() => setPreview(null)} />
    </main>
  );
}

/**
 * Search page.
 *
 * @returns The page element.
 */
export default function SearchPage(): React.JSX.Element {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="min-h-dvh" />}>
        <SearchResults />
      </Suspense>
      <SiteFooter />
    </>
  );
}
