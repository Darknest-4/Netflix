import { MATURITY_LABELS, type MaturityRating } from '@nova/shared';

/**
 * Renders the personalised match score.
 *
 * @param props.score - 0-100 match score from the recommendation engine.
 * @returns The badge element.
 */
export function MatchBadge({ score }: { score: number }): React.JSX.Element {
  return (
    <span className="font-bold text-success" title="Egyezés a nézési előzményeid alapján">
      {Math.round(score)}% egyezés
    </span>
  );
}

/**
 * Renders the age classification.
 *
 * @param props.rating - Maturity rating of the title.
 * @returns The badge element.
 */
export function MaturityBadge({ rating }: { rating: MaturityRating }): React.JSX.Element {
  return (
    <span
      className="rounded border border-[var(--surface-border)] px-1.5 py-px text-xs font-medium text-[var(--text-secondary)]"
      aria-label={`Korhatár: ${MATURITY_LABELS[rating]}`}
    >
      {MATURITY_LABELS[rating]}
    </span>
  );
}

/**
 * Renders the "Újdonság" flag.
 *
 * @returns The badge element.
 */
export function NewBadge(): React.JSX.Element {
  return (
    <span className="rounded bg-nova-red px-1.5 py-px text-[11px] font-bold uppercase tracking-wide text-white">
      Újdonság
    </span>
  );
}

/**
 * Renders the "NOVA saját gyártás" flag.
 *
 * @returns The badge element.
 */
export function OriginalBadge(): React.JSX.Element {
  return (
    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-nova-red">
      NOVA eredeti
    </span>
  );
}
