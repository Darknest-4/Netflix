'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES, type PaginatedResponse, type TitleSummaryDto } from '@nova/shared';

import { apiFetch } from '@/lib/api-client';
import { PreviewModal } from './PreviewModal';
import { TitleCard } from './TitleCard';
import { Skeleton } from '@/components/ui/Skeleton';

/** Props of {@link SimilarTitles}. */
export interface SimilarTitlesProps {
  /** Ids computed by the catalog module. */
  titleIds: string[];
}

/**
 * "Hasonló címek" grid on the detail page.
 *
 * Loads lazily on the client: the section sits below the fold, so it must not
 * slow down the server rendered part of the page.
 *
 * @param props - Ids of the similar titles.
 * @returns The section element, or `null` when there is nothing to show.
 */
export function SimilarTitles({ titleIds }: SimilarTitlesProps): React.JSX.Element | null {
  const [titles, setTitles] = useState<TitleSummaryDto[]>([]);
  const [loading, setLoading] = useState(titleIds.length > 0);
  const [preview, setPreview] = useState<TitleSummaryDto | null>(null);

  useEffect(() => {
    if (titleIds.length === 0) {
      return;
    }

    let cancelled = false;
    void apiFetch<PaginatedResponse<TitleSummaryDto>>(`${API_ROUTES.catalog.titles}?perPage=60`)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const wanted = new Set(titleIds);
        setTitles(response.data.filter((title) => wanted.has(title.id)).slice(0, 12));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [titleIds]);

  if (titleIds.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="similar-heading"
      className="border-t border-[var(--surface-border)] px-[var(--spacing-row-gutter)] py-10"
    >
      <h2 id="similar-heading" className="text-xl font-bold">
        Hasonló címek
      </h2>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_unused, index) => (
            <Skeleton key={index} className="aspect-video" />
          ))}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-16 sm:grid-cols-4 lg:grid-cols-6">
          {titles.map((title) => (
            <li key={title.id}>
              <TitleCard title={title} onPreview={setPreview} />
            </li>
          ))}
        </ul>
      )}

      <PreviewModal title={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
