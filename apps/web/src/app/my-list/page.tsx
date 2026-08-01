'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES, type TitleSummaryDto } from '@nova/shared';

import { PreviewModal } from '@/components/catalog/PreviewModal';
import { TitleCard } from '@/components/catalog/TitleCard';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';

/**
 * "Saját lista" page.
 *
 * @returns The page element.
 */
export default function MyListPage(): React.JSX.Element {
  const { activeProfile, authFetch } = useSession();
  const { notify } = useToast();

  const [titles, setTitles] = useState<TitleSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<TitleSummaryDto | null>(null);

  useEffect(() => {
    if (!activeProfile) {
      return;
    }

    let cancelled = false;
    void authFetch<TitleSummaryDto[]>(API_ROUTES.watchlist.list(activeProfile.id))
      .then((result) => {
        if (!cancelled) {
          setTitles(result);
        }
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
  }, [activeProfile, authFetch]);

  /**
   * Removes a title from the list.
   *
   * @param titleId - Catalog entry to remove.
   */
  const remove = async (titleId: string): Promise<void> => {
    if (!activeProfile) {
      return;
    }
    setTitles((current) => current.filter((title) => title.id !== titleId));
    await authFetch(API_ROUTES.watchlist.toggle(activeProfile.id, titleId), {
      method: 'POST',
    }).catch(() => notify('Az eltávolítás nem sikerült.', 'error'));
  };

  return (
    <>
      <SiteHeader />

      <main className="min-h-dvh px-[var(--spacing-row-gutter)] pb-16 pt-28">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">A listám</h1>

        {loading && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_unused, index) => (
              <Skeleton key={index} className="aspect-video" />
            ))}
          </div>
        )}

        {!loading && titles.length === 0 && (
          <div className="mt-16 max-w-md">
            <p className="text-lg font-semibold">A listád még üres.</p>
            <p className="mt-2 text-[var(--text-secondary)]">
              Böngészés közben a kártyák „+” gombjával mentheted el, amit később néznél meg.
            </p>
            <Button href="/browse" className="mt-6">
              Irány a katalógus
            </Button>
          </div>
        )}

        {titles.length > 0 && (
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-16 sm:grid-cols-4 lg:grid-cols-6">
            {titles.map((title) => (
              <li key={title.id} className="space-y-1">
                <TitleCard title={title} onPreview={setPreview} />
                <button
                  type="button"
                  onClick={() => void remove(title.id)}
                  className="text-xs text-[var(--text-muted)] underline hover:text-danger"
                >
                  Eltávolítás
                </button>
              </li>
            ))}
          </ul>
        )}

        <PreviewModal title={preview} onClose={() => setPreview(null)} />
      </main>

      <SiteFooter />
    </>
  );
}
