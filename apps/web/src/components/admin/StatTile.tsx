/** Props of {@link StatTile}. */
export interface StatTileProps {
  label: string;
  value: string;
  /** Secondary line under the value. */
  hint?: string;
}

/**
 * Single KPI tile of the admin dashboard.
 *
 * @param props - Label, formatted value and hint.
 * @returns The tile element.
 */
export function StatTile({ label, value, hint }: StatTileProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
