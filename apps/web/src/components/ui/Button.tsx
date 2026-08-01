import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Visual variants of {@link Button}. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Size tokens of {@link Button}. */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Props of {@link Button}. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a link styled as a button when set. */
  href?: string;
  /** Shows a spinner and blocks interaction. */
  loading?: boolean;
  /** Stretches the button to the full width of its container. */
  fullWidth?: boolean;
  /** Icon rendered before the label. */
  icon?: ReactNode;
}

/** Classes shared by every variant. */
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[background-color,color,transform,opacity] duration-200 ease-[var(--ease-nova)] disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px';

/** Variant specific classes. */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-nova-red text-white hover:bg-nova-red-strong',
  secondary: 'bg-white/15 text-[var(--text-primary)] backdrop-blur hover:bg-white/25',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  danger: 'bg-danger text-white hover:brightness-110',
};

/** Size specific classes. */
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-13 px-7 text-base',
};

/**
 * The single button primitive of the app.
 *
 * Renders a `<button>` or, when `href` is given, a Next.js `<Link>` with
 * identical styling — so navigation and actions never drift apart visually.
 *
 * @param props - Variant, size, link target and native button attributes.
 * @returns The button element.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  href,
  loading = false,
  fullWidth = false,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps): React.JSX.Element {
  const classes = `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

  const content = (
    <>
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
