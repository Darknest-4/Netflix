/**
 * Route level loading state.
 *
 * @returns The spinner element.
 */
export default function Loading(): React.JSX.Element {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div
        role="status"
        aria-label="Betöltés"
        className="size-12 animate-spin rounded-full border-4 border-[var(--color-ink-700)] border-t-nova-red"
      />
    </div>
  );
}
