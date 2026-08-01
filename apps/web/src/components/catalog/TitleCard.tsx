'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TitleKind, formatDuration, type TitleSummaryDto } from '@nova/shared';

import { Artwork } from './Artwork';
import { MatchBadge, MaturityBadge, NewBadge } from './MetaBadges';

/** Props of {@link TitleCard}. */
export interface TitleCardProps {
  title: TitleSummaryDto;
  /** Resume progress in percent; renders the progress bar when set. */
  progressPercent?: number;
  /** Secondary line, e.g. `S2:E4 · 4. rész`. */
  caption?: string;
  /** Invoked when the card opens the preview modal. */
  onPreview?: (title: TitleSummaryDto) => void;
  /** Direct-play target; falls back to the detail page. */
  playHref?: string;
}

/**
 * Catalog card.
 *
 * Hovering (or focusing) lifts the card and reveals the action bar, matching the
 * interaction model members expect from a streaming grid. The whole card is a
 * link, so keyboard and screen reader users get a single, predictable target.
 *
 * @param props - Title, progress and interaction handlers.
 * @returns The card element.
 */
export function TitleCard({
  title,
  progressPercent,
  caption,
  onPreview,
  playHref,
}: TitleCardProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false);

  const runtime =
    title.kind === TitleKind.SERIES
      ? `${title.seasonCount ?? 1} évad`
      : title.durationSeconds
        ? formatDuration(title.durationSeconds)
        : '';

  return (
    <article
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <Link
        href={`/title/${title.slug}`}
        className="block overflow-hidden rounded-md ring-nova-red-soft transition-transform duration-300 ease-[var(--ease-nova)] group-hover:scale-[1.06] group-focus-within:scale-[1.06]"
        aria-label={`${title.name} — adatlap megnyitása`}
      >
        <Artwork artwork={title.artwork} ratio="wide" />

        {typeof progressPercent === 'number' && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
            <div
              className="h-full bg-nova-red"
              style={{ width: `${Math.min(100, Math.max(2, progressPercent))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${title.name} megtekintve`}
            />
          </div>
        )}
      </Link>

      <div
        className={`pointer-events-none absolute inset-x-0 top-full z-20 rounded-b-md bg-[var(--surface-overlay)] p-3 shadow-xl transition-opacity duration-200 ${
          hovered ? 'pointer-events-auto opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2">
          <Link
            href={playHref ?? `/watch/${title.id}`}
            className="grid size-8 place-items-center rounded-full bg-white text-black transition-transform hover:scale-105"
            aria-label={`${title.name} lejátszása`}
          >
            <svg viewBox="0 0 24 24" className="size-4 translate-x-px fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </Link>
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(title)}
              className="grid size-8 place-items-center rounded-full border border-white/40 text-sm transition-colors hover:border-white"
              aria-label={`${title.name} részletei`}
            >
              ⌄
            </button>
          )}
          <span className="ml-auto text-xs">
            <MatchBadge score={title.matchScore} />
          </span>
        </div>

        <p className="mt-2 truncate text-sm font-semibold">{title.name}</p>
        {caption && <p className="truncate text-xs text-[var(--text-muted)]">{caption}</p>}

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <MaturityBadge rating={title.maturityRating} />
          {runtime && <span>{runtime}</span>}
          {title.isNew && <NewBadge />}
        </div>

        <p className="mt-1.5 truncate text-xs text-[var(--text-muted)]">
          {title.genres.slice(0, 3).join(' · ')}
        </p>
      </div>
    </article>
  );
}
