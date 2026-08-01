'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDuration, type TitleDetailDto } from '@nova/shared';

import { Artwork } from './Artwork';

/** Props of {@link EpisodeList}. */
export interface EpisodeListProps {
  title: TitleDetailDto;
}

/**
 * Season selector and episode list of a series.
 *
 * @param props - The series detail payload.
 * @returns The episode section.
 */
export function EpisodeList({ title }: EpisodeListProps): React.JSX.Element {
  const [seasonNumber, setSeasonNumber] = useState(title.seasons[0]?.seasonNumber ?? 1);
  const season = title.seasons.find((entry) => entry.seasonNumber === seasonNumber) ?? title.seasons[0];

  return (
    <section
      aria-labelledby="episodes-heading"
      className="border-t border-[var(--surface-border)] px-[var(--spacing-row-gutter)] py-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="episodes-heading" className="text-xl font-bold">
          Epizódok
        </h2>

        <div>
          <label htmlFor="season-select" className="sr-only">
            Évad választása
          </label>
          <select
            id="season-select"
            value={seasonNumber}
            onChange={(event) => setSeasonNumber(Number(event.target.value))}
            className="h-10 rounded-md border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 text-sm"
          >
            {title.seasons.map((entry) => (
              <option key={entry.id} value={entry.seasonNumber}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-[var(--surface-border)]">
        {season?.episodes.map((episode) => (
          <li key={episode.id}>
            <Link
              href={`/watch/${title.id}?episodeId=${episode.id}`}
              className="flex items-center gap-4 py-4 transition-colors hover:bg-white/5"
            >
              <span className="w-6 text-center text-lg font-semibold text-[var(--text-muted)]">
                {episode.episodeNumber}
              </span>

              <span className="w-32 shrink-0 overflow-hidden rounded sm:w-44">
                <Artwork
                  artwork={episode.artwork}
                  ratio="wide"
                  showWordmark={false}
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold">{episode.name}</span>
                  <span className="shrink-0 text-sm text-[var(--text-muted)]">
                    {formatDuration(episode.durationSeconds)}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 block text-sm text-[var(--text-secondary)]">
                  {episode.synopsis}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
