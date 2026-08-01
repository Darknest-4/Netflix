'use client';

import { useCallback, useRef } from 'react';
import { RowLayout, type CatalogRowDto, type TitleSummaryDto } from '@nova/shared';

import { TitleCard } from './TitleCard';
import { Top10Card } from './Top10Card';

/** Props of {@link CatalogRow}. */
export interface CatalogRowProps {
  row: CatalogRowDto;
  /** Resume percentages keyed by title id, used by the continue-watching row. */
  progressByTitleId?: Record<string, number>;
  /** Captions keyed by title id (e.g. `S2:E4`). */
  captionByTitleId?: Record<string, string>;
  /** Opens the preview modal. */
  onPreview?: (title: TitleSummaryDto) => void;
}

/**
 * Horizontally scrolling catalog row.
 *
 * Scrolling uses native CSS scroll-snap (no layout measuring on the main
 * thread); the arrow buttons are a progressive enhancement and are hidden from
 * assistive technology because the list itself is keyboard scrollable.
 *
 * @param props - Row payload and interaction handlers.
 * @returns The row element.
 */
export function CatalogRow({
  row,
  progressByTitleId,
  captionByTitleId,
  onPreview,
}: CatalogRowProps): React.JSX.Element {
  const scroller = useRef<HTMLUListElement>(null);

  /**
   * Scrolls the row by roughly one viewport.
   *
   * @param direction - `-1` for previous, `1` for next.
   */
  const scrollBy = useCallback((direction: -1 | 1): void => {
    const element = scroller.current;
    if (!element) {
      return;
    }
    element.scrollBy({ left: direction * element.clientWidth * 0.86, behavior: 'smooth' });
  }, []);

  const isTopTen = row.layout === RowLayout.TOP_TEN;

  return (
    <section
      className="group/row relative py-4"
      aria-labelledby={`row-${row.id}`}
    >
      <h2
        id={`row-${row.id}`}
        className="mb-2 px-[var(--spacing-row-gutter)] text-lg font-bold tracking-tight sm:text-xl"
      >
        {row.title}
      </h2>

      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-1/2 z-30 hidden h-[62%] w-[var(--spacing-row-gutter)] -translate-y-1/2 items-center justify-center bg-black/45 text-2xl text-white opacity-0 transition-opacity duration-200 group-hover/row:opacity-100 md:flex"
      >
        ‹
      </button>

      <ul ref={scroller} className={`row-scroller ${isTopTen ? 'items-end' : 'items-start'}`}>
        {row.items.map((title, index) => (
          <li key={title.id} className={isTopTen ? '' : 'pb-[calc(var(--spacing-row-gutter)/2)]'}>
            {isTopTen ? (
              <Top10Card title={title} rank={index + 1} />
            ) : (
              <TitleCard
                title={title}
                progressPercent={progressByTitleId?.[title.id]}
                caption={captionByTitleId?.[title.id]}
                onPreview={onPreview}
              />
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-1/2 z-30 hidden h-[62%] w-[var(--spacing-row-gutter)] -translate-y-1/2 items-center justify-center bg-black/45 text-2xl text-white opacity-0 transition-opacity duration-200 group-hover/row:opacity-100 md:flex"
      >
        ›
      </button>
    </section>
  );
}
