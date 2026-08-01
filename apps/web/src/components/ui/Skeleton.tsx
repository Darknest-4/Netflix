/** Props of {@link Skeleton}. */
export interface SkeletonProps {
  /** Extra classes controlling size and radius. */
  className?: string;
}

/**
 * Shimmering placeholder block.
 *
 * Marked `aria-hidden` because the surrounding region already announces its
 * loading state through `aria-busy`.
 *
 * @param props - Layout classes.
 * @returns The placeholder element.
 */
export function Skeleton({ className = '' }: SkeletonProps): React.JSX.Element {
  return <div aria-hidden="true" className={`shimmer rounded-md ${className}`} />;
}

/**
 * Row of poster placeholders shown while a catalog row loads.
 *
 * @param props.count - Number of placeholder cards.
 * @returns The placeholder row.
 */
export function RowSkeleton({ count = 6 }: { count?: number }): React.JSX.Element {
  return (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="ml-[var(--spacing-row-gutter)] h-5 w-48" />
      <div className="row-scroller">
        {Array.from({ length: count }, (_unused, index) => (
          <Skeleton key={index} className="aspect-video w-full" />
        ))}
      </div>
    </div>
  );
}
