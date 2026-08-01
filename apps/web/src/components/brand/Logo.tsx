import Link from 'next/link';
import { BRAND_NAME } from '@nova/shared';

/** Props of {@link Logo}. */
export interface LogoProps {
  /** Rendered size of the wordmark. */
  size?: 'sm' | 'md' | 'lg';
  /** When true the logo is a link to the landing page. */
  asLink?: boolean;
  /** Destination of the link variant. */
  href?: string;
}

/** Font size and letter spacing per size token. */
const SIZE_CLASS: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-lg tracking-[0.22em]',
  md: 'text-2xl tracking-[0.24em]',
  lg: 'text-4xl sm:text-5xl tracking-[0.26em]',
};

/**
 * NOVA wordmark.
 *
 * An original letterform treatment: heavy weight, wide tracking and a red-to-
 * ember gradient, with a small orbiting dot standing in for the "supernova"
 * idea behind the name.
 *
 * @param props - Size and link behaviour.
 * @returns The wordmark element.
 */
export function Logo({ size = 'md', asLink = true, href = '/' }: LogoProps): React.JSX.Element {
  const mark = (
    <span className={`relative inline-flex items-baseline font-black ${SIZE_CLASS[size]}`}>
      <span
        className="bg-gradient-to-r from-nova-red-soft via-nova-red to-nova-red-strong bg-clip-text text-transparent"
        style={{ WebkitTextStroke: '0.4px rgba(255,255,255,0.06)' }}
      >
        {BRAND_NAME}
      </span>
      <span
        aria-hidden="true"
        className="ml-[0.12em] inline-block size-[0.22em] translate-y-[-0.9em] rounded-full bg-nova-red-soft"
      />
    </span>
  );

  if (!asLink) {
    return mark;
  }

  return (
    <Link href={href} aria-label={`${BRAND_NAME} kezdőlap`} className="inline-flex items-center">
      {mark}
    </Link>
  );
}
