import type { ArtworkDto } from '@nova/shared';

/** Props of {@link Artwork}. */
export interface ArtworkProps {
  /** Deterministic descriptor produced by the API. */
  artwork: ArtworkDto;
  /** Rendered aspect ratio. */
  ratio?: 'poster' | 'wide' | 'square';
  /** Whether the wordmark is drawn on top. */
  showWordmark?: boolean;
  /** Additional classes for the wrapper. */
  className?: string;
  /** Secondary line rendered under the wordmark (e.g. season/episode). */
  caption?: string;
}

/** Aspect ratio classes per token. */
const RATIO_CLASS: Record<NonNullable<ArtworkProps['ratio']>, string> = {
  poster: 'aspect-[2/3]',
  wide: 'aspect-video',
  square: 'aspect-square',
};

/**
 * Renders the procedural artwork of a title.
 *
 * Every visual is generated from the descriptor — gradient, pattern and
 * wordmark — so the platform ships without a single third-party image, stays
 * fully offline capable and never triggers a layout shift.
 *
 * @param props - Artwork descriptor and layout options.
 * @returns The artwork element.
 */
export function Artwork({
  artwork,
  ratio = 'poster',
  showWordmark = true,
  className = '',
  caption,
}: ArtworkProps): React.JSX.Element {
  const patternStyle = buildPattern(artwork);

  return (
    <div
      className={`relative isolate w-full overflow-hidden ${RATIO_CLASS[ratio]} ${className}`}
      style={{
        backgroundImage: `linear-gradient(${artwork.angle}deg, ${artwork.from}, ${artwork.to})`,
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 opacity-70" style={patternStyle} />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"
      />
      {showWordmark && (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-1 p-4 text-center">
          <span className="w-full min-w-0 hyphens-auto break-words text-balance text-[13px] font-black uppercase leading-tight tracking-[0.16em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-sm">
            {artwork.wordmark}
          </span>
          {caption && (
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/70">
              {caption}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Builds the CSS of the procedural overlay pattern.
 *
 * @param artwork - Artwork descriptor.
 * @returns Inline style implementing the pattern.
 */
function buildPattern(artwork: ArtworkDto): React.CSSProperties {
  switch (artwork.pattern) {
    case 'rays':
      return {
        backgroundImage: `repeating-conic-gradient(from ${artwork.angle}deg at 70% 20%, rgba(255,255,255,0.10) 0deg 6deg, transparent 6deg 18deg)`,
      };
    case 'waves':
      return {
        backgroundImage:
          'repeating-radial-gradient(circle at 20% 120%, rgba(255,255,255,0.12) 0 2px, transparent 2px 26px)',
      };
    case 'grid':
      return {
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
        backgroundSize: '34px 34px',
      };
    case 'orbit':
      return {
        backgroundImage:
          'radial-gradient(circle at 78% 26%, rgba(255,255,255,0.28) 0 6%, transparent 6.5%), radial-gradient(circle at 78% 26%, transparent 28%, rgba(255,255,255,0.14) 28.4%, transparent 29%)',
      };
    case 'grain':
    default:
      return {
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '5px 5px, 9px 9px',
        backgroundPosition: '0 0, 3px 4px',
      };
  }
}
