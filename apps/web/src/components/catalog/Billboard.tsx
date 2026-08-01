'use client';

import { TitleKind, formatDuration, type BillboardDto } from '@nova/shared';

import { Artwork } from './Artwork';
import { MaturityBadge, NewBadge, OriginalBadge } from './MetaBadges';
import { Button } from '@/components/ui/Button';

/** Props of {@link Billboard}. */
export interface BillboardProps {
  billboard: BillboardDto;
  /** Toggles the title on the member's list. */
  onToggleMyList?: (titleId: string) => void;
  /** Opens the preview modal. */
  onMoreInfo?: () => void;
}

/**
 * Full-bleed hero at the top of the browse page.
 *
 * The artwork is decorative and the scrim guarantees text contrast, so the
 * headline and synopsis stay readable at every viewport width.
 *
 * @param props - Billboard payload and actions.
 * @returns The hero element.
 */
export function Billboard({
  billboard,
  onToggleMyList,
  onMoreInfo,
}: BillboardProps): React.JSX.Element {
  const { title } = billboard;

  const meta =
    title.kind === TitleKind.SERIES
      ? `${title.seasonCount ?? 1} évad`
      : title.durationSeconds
        ? formatDuration(title.durationSeconds)
        : '';

  return (
    <section className="relative isolate min-h-[62vh] w-full sm:min-h-[76vh]" aria-labelledby="billboard-title">
      <div className="absolute inset-0 -z-10">
        <Artwork
          artwork={title.artwork}
          ratio="wide"
          showWordmark={false}
          className="h-full min-h-[62vh] sm:min-h-[76vh]"
        />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'var(--scrim)' }} />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent"
        />
      </div>

      <div className="flex min-h-[62vh] max-w-3xl flex-col justify-end gap-4 px-[var(--spacing-row-gutter)] pb-16 pt-28 sm:min-h-[76vh] sm:pb-24">
        {title.isOriginal && <OriginalBadge />}

        <h1
          id="billboard-title"
          className="text-balance text-4xl font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)] sm:text-6xl"
        >
          {title.name}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
          <span className="font-bold text-success">{title.matchScore}% egyezés</span>
          <span>{title.releaseYear}</span>
          <MaturityBadge rating={title.maturityRating} />
          {meta && <span>{meta}</span>}
          {title.isNew && <NewBadge />}
        </div>

        <p className="max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
          {billboard.synopsis}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button
            href={`/watch/${title.id}`}
            size="lg"
            variant="secondary"
            className="!bg-white !text-black hover:!bg-white/85"
            icon={
              <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            }
          >
            Lejátszás
          </Button>

          <Button size="lg" variant="secondary" onClick={onMoreInfo}>
            További információ
          </Button>

          {onToggleMyList && (
            <button
              type="button"
              onClick={() => onToggleMyList(title.id)}
              aria-pressed={billboard.inMyList}
              aria-label={
                billboard.inMyList ? 'Eltávolítás a listámról' : 'Hozzáadás a listámhoz'
              }
              className="grid size-11 place-items-center rounded-full border-2 border-white/50 bg-black/30 text-xl text-white transition-colors hover:border-white"
            >
              {billboard.inMyList ? '✓' : '+'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
