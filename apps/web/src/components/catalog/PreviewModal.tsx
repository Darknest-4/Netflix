'use client';

import { useEffect, useState } from 'react';
import {
  API_ROUTES,
  TitleKind,
  formatDuration,
  type TitleDetailDto,
  type TitleSummaryDto,
} from '@nova/shared';

import { apiFetch } from '@/lib/api-client';
import { Artwork } from './Artwork';
import { MatchBadge, MaturityBadge, NewBadge } from './MetaBadges';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

/** Props of {@link PreviewModal}. */
export interface PreviewModalProps {
  /** Title to preview, or `null` when the modal is closed. */
  title: TitleSummaryDto | null;
  onClose: () => void;
  /** Toggles the title on the member's list. */
  onToggleMyList?: (titleId: string) => void;
  /** Whether the title is currently on the list. */
  inMyList?: boolean;
}

/**
 * Quick-look modal opened from a catalog card.
 *
 * Loads the full detail payload lazily, so browsing stays cheap and only an
 * explicit preview costs a request.
 *
 * @param props - Title, close handler and list state.
 * @returns The modal element.
 */
export function PreviewModal({
  title,
  onClose,
  onToggleMyList,
  inMyList = false,
}: PreviewModalProps): React.JSX.Element {
  const [detail, setDetail] = useState<TitleDetailDto | null>(null);

  useEffect(() => {
    if (!title) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    void apiFetch<TitleDetailDto>(API_ROUTES.catalog.titleBySlug(title.slug))
      .then((result) => {
        if (!cancelled) {
          setDetail(result);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [title]);

  if (!title) {
    return <Modal open={false} onClose={onClose} title="" children={null} />;
  }

  const runtime =
    title.kind === TitleKind.SERIES
      ? `${title.seasonCount ?? 1} évad`
      : title.durationSeconds
        ? formatDuration(title.durationSeconds)
        : '';

  return (
    <Modal open onClose={onClose} title={title.name} hideHeader size="xl">
      <div className="relative">
        <Artwork artwork={title.artwork} ratio="wide" showWordmark={false} className="max-h-[46vh]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[var(--surface-overlay)] via-transparent to-transparent"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Bezárás"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-black/70 text-lg text-white hover:bg-black"
        >
          ×
        </button>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-3 p-6">
          <Button
            href={`/watch/${title.id}`}
            className="!bg-white !text-black hover:!bg-white/85"
            icon={
              <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            }
          >
            Lejátszás
          </Button>
          {onToggleMyList && (
            <button
              type="button"
              onClick={() => onToggleMyList(title.id)}
              aria-pressed={inMyList}
              aria-label={inMyList ? 'Eltávolítás a listámról' : 'Hozzáadás a listámhoz'}
              className="grid size-10 place-items-center rounded-full border-2 border-white/50 bg-black/40 text-lg text-white hover:border-white"
            >
              {inMyList ? '✓' : '+'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <MatchBadge score={title.matchScore} />
            <span>{title.releaseYear}</span>
            <MaturityBadge rating={title.maturityRating} />
            {runtime && <span>{runtime}</span>}
            {title.isNew && <NewBadge />}
          </div>

          {detail ? (
            <p className="text-pretty text-[15px] leading-relaxed text-[var(--text-secondary)]">
              {detail.synopsis}
            </p>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-9/12" />
            </div>
          )}

          <Button href={`/title/${title.slug}`} variant="ghost" className="!px-0">
            Teljes adatlap →
          </Button>
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Szereplők</dt>
            <dd className="text-[var(--text-secondary)]">
              {detail?.cast.slice(0, 4).join(', ') ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Műfaj</dt>
            <dd className="text-[var(--text-secondary)]">{title.genres.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Hangulat</dt>
            <dd className="text-[var(--text-secondary)]">{title.moods.join(', ')}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
