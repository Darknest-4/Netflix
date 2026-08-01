import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/Logo';

/** Props of {@link AuthShell}. */
export interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered under the card (e.g. "Nincs még fiókod?"). */
  footer?: ReactNode;
}

/**
 * Shared frame of the sign-in and sign-up screens.
 *
 * @param props - Heading, form content and footer.
 * @returns The auth layout.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps): React.JSX.Element {
  return (
    <div className="relative isolate min-h-dvh">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="size-full bg-[radial-gradient(ellipse_at_20%_-10%,rgba(225,29,46,0.35),transparent_55%),radial-gradient(ellipse_at_85%_10%,rgba(67,56,202,0.35),transparent_50%)]" />
        <div className="absolute inset-0 bg-[var(--surface-base)]/85" />
      </div>

      <header className="px-[var(--spacing-row-gutter)] py-6">
        <Logo size="md" href="/" />
      </header>

      <main className="mx-auto w-full max-w-md px-6 pb-20">
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)]/95 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-sm text-[var(--text-secondary)]">{footer}</div>}
      </main>
    </div>
  );
}
