'use client';

import Link from 'next/link';
import type { TitleSummaryDto } from '@nova/shared';

import { Artwork } from './Artwork';

/** Props of {@link Top10Card}. */
export interface Top10CardProps {
  title: TitleSummaryDto;
  /** 1-based position in the chart. */
  rank: number;
}

/**
 * Top 10 card with an oversized rank numeral.
 *
 * The numeral is decorative — the rank is also announced in the link label, so
 * the information is not conveyed by shape alone.
 *
 * @param props - Title and rank.
 * @returns The card element.
 */
export function Top10Card({ title, rank }: Top10CardProps): React.JSX.Element {
  return (
    <article className="group flex items-end">
      <span
        aria-hidden="true"
        className="-mr-4 select-none font-black leading-none text-transparent"
        style={{
          fontSize: 'clamp(72px, 9vw, 140px)',
          WebkitTextStroke: '3px var(--color-ink-600)',
        }}
      >
        {rank}
      </span>
      <Link
        href={`/title/${title.slug}`}
        aria-label={`${rank}. helyezett: ${title.name}`}
        className="w-[62%] shrink-0 overflow-hidden rounded-md transition-transform duration-300 ease-[var(--ease-nova)] group-hover:scale-[1.05] group-focus-within:scale-[1.05]"
      >
        <Artwork artwork={title.artwork} ratio="poster" />
      </Link>
    </article>
  );
}
