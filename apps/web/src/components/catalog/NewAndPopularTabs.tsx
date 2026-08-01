'use client';

import { useState } from 'react';
import type { TitleSummaryDto } from '@nova/shared';

import { PreviewModal } from './PreviewModal';
import { TitleCard } from './TitleCard';

/** Props of {@link NewAndPopularTabs}. */
export interface NewAndPopularTabsProps {
  newReleases: TitleSummaryDto[];
  trending: TitleSummaryDto[];
  originals: TitleSummaryDto[];
}

/** Tab identifiers. */
type TabId = 'new' | 'trending' | 'originals';

/**
 * Tabbed grid of new, trending and original titles.
 *
 * Implements the WAI-ARIA tabs pattern: arrow keys move between tabs and only
 * the selected panel is exposed.
 *
 * @param props - The three title collections.
 * @returns The tabbed section.
 */
export function NewAndPopularTabs({
  newReleases,
  trending,
  originals,
}: NewAndPopularTabsProps): React.JSX.Element {
  const [active, setActive] = useState<TabId>('new');
  const [preview, setPreview] = useState<TitleSummaryDto | null>(null);

  const tabs: { id: TabId; label: string; items: TitleSummaryDto[] }[] = [
    { id: 'new', label: 'Friss megjelenések', items: newReleases },
    { id: 'trending', label: 'Most felkapott', items: trending },
    { id: 'originals', label: 'NOVA saját gyártás', items: originals },
  ];

  const current = tabs.find((tab) => tab.id === active) ?? tabs[0]!;

  return (
    <>
      <div role="tablist" aria-label="Kategóriák" className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                const offset = event.key === 'ArrowRight' ? 1 : -1;
                const next = tabs[(index + offset + tabs.length) % tabs.length]!;
                setActive(next.id);
                document.getElementById(`tab-${next.id}`)?.focus();
              }
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active === tab.id
                ? 'bg-nova-red text-white'
                : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${current.id}`}
        aria-labelledby={`tab-${current.id}`}
        className="mt-8"
      >
        {current.items.length === 0 ? (
          <p className="text-[var(--text-secondary)]">Ebben a kategóriában most nincs tartalom.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-16 sm:grid-cols-4 lg:grid-cols-6">
            {current.items.map((title) => (
              <li key={title.id}>
                <TitleCard title={title} onPreview={setPreview} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <PreviewModal title={preview} onClose={() => setPreview(null)} />
    </>
  );
}
