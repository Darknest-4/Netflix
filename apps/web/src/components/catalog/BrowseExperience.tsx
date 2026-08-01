'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  API_ROUTES,
  RowLayout,
  type BrowsePageDto,
  type ContinueWatchingItemDto,
  type TitleSummaryDto,
} from '@nova/shared';

import { Billboard } from './Billboard';
import { CatalogRow } from './CatalogRow';
import { PreviewModal } from './PreviewModal';
import { RowSkeleton } from '@/components/ui/Skeleton';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';

/** Props of {@link BrowseExperience}. */
export interface BrowseExperienceProps {
  /** Restricts the page to movies or series. */
  kind?: 'MOVIE' | 'SERIES';
  /** Heading announced to assistive technology. */
  pageTitle: string;
}

/**
 * The member browse experience.
 *
 * Renders the billboard and every personalised row from a single API call, and
 * owns the shared interactions: preview modal, watchlist toggling and the
 * continue-watching progress overlay.
 *
 * @param props - Optional kind restriction and page title.
 * @returns The browse page.
 */
export function BrowseExperience({ kind, pageTitle }: BrowseExperienceProps): React.JSX.Element {
  const router = useRouter();
  const { status, activeProfile, authFetch } = useSession();
  const { notify } = useToast();

  const [page, setPage] = useState<BrowsePageDto | null>(null);
  const [continueItems, setContinueItems] = useState<ContinueWatchingItemDto[]>([]);
  const [myListIds, setMyListIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<TitleSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  /** Redirects to the profile gate when no profile is active. */
  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/browse');
      return;
    }
    if (status === 'authenticated' && !activeProfile) {
      router.replace('/profiles');
    }
  }, [status, activeProfile, router]);

  /** Loads the page payload whenever the profile or the filter changes. */
  useEffect(() => {
    if (!activeProfile) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async (): Promise<void> => {
      try {
        const query = new URLSearchParams({ profileId: activeProfile.id });
        if (kind) {
          query.set('kind', kind);
        }

        const [browse, continueWatching, myList] = await Promise.all([
          authFetch<BrowsePageDto>(`${API_ROUTES.catalog.browse}?${query.toString()}`),
          authFetch<ContinueWatchingItemDto[]>(
            API_ROUTES.playback.continueWatching(activeProfile.id),
          ),
          authFetch<TitleSummaryDto[]>(API_ROUTES.watchlist.list(activeProfile.id)),
        ]);

        if (cancelled) {
          return;
        }

        setPage(browse);
        setContinueItems(continueWatching);
        setMyListIds(new Set(myList.map((title) => title.id)));
      } catch {
        if (!cancelled) {
          notify('A tartalom betöltése nem sikerült.', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeProfile, kind, authFetch, notify]);

  /**
   * Adds or removes a title from the member's list.
   *
   * @param titleId - Catalog entry to toggle.
   */
  const toggleMyList = useCallback(
    async (titleId: string): Promise<void> => {
      if (!activeProfile) {
        return;
      }
      try {
        const result = await authFetch<{ inMyList: boolean }>(
          API_ROUTES.watchlist.toggle(activeProfile.id, titleId),
          { method: 'POST' },
        );
        setMyListIds((current) => {
          const next = new Set(current);
          if (result.inMyList) {
            next.add(titleId);
          } else {
            next.delete(titleId);
          }
          return next;
        });
        notify(result.inMyList ? 'Hozzáadva a listádhoz.' : 'Eltávolítva a listádról.', 'success');
      } catch {
        notify('A művelet nem sikerült.', 'error');
      }
    },
    [activeProfile, authFetch, notify],
  );

  /** Resume percentages keyed by title id. */
  const progressByTitleId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of continueItems) {
      map[item.title.id] = item.percent;
    }
    return map;
  }, [continueItems]);

  /** `S2:E4` style captions keyed by title id. */
  const captionByTitleId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of continueItems) {
      if (item.episode) {
        map[item.title.id] =
          `S${item.episode.seasonNumber}:E${item.episode.episodeNumber} · ${item.episode.name}`;
      }
    }
    return map;
  }, [continueItems]);

  return (
    <>
      <SiteHeader />

      <main className="min-h-dvh pb-16">
        <h1 className="sr-only">{pageTitle}</h1>

        {loading && !page && (
          <div className="space-y-6 pt-24">
            <div className="shimmer mx-[var(--spacing-row-gutter)] h-[46vh] rounded-xl" />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        )}

        {page && (
          <>
            <Billboard
              billboard={{ ...page.billboard, inMyList: myListIds.has(page.billboard.title.id) }}
              onToggleMyList={(titleId) => void toggleMyList(titleId)}
              onMoreInfo={() => setPreview(page.billboard.title)}
            />

            <div className="relative z-10 -mt-14 space-y-2">
              {page.rows.map((row) => (
                <CatalogRow
                  key={row.id}
                  row={row}
                  progressByTitleId={row.layout === RowLayout.CONTINUE ? progressByTitleId : undefined}
                  captionByTitleId={row.layout === RowLayout.CONTINUE ? captionByTitleId : undefined}
                  onPreview={setPreview}
                />
              ))}
            </div>
          </>
        )}

        {!loading && !page && (
          <div className="grid min-h-[60vh] place-items-center px-6 text-center">
            <div>
              <p className="text-xl font-semibold">Most nem érhető el a katalógus.</p>
              <p className="mt-2 text-[var(--text-secondary)]">
                Ellenőrizd, hogy fut-e az API, majd frissítsd az oldalt.
              </p>
            </div>
          </div>
        )}
      </main>

      <PreviewModal
        title={preview}
        onClose={() => setPreview(null)}
        onToggleMyList={(titleId) => void toggleMyList(titleId)}
        inMyList={preview ? myListIds.has(preview.id) : false}
      />

      <SiteFooter />
    </>
  );
}
