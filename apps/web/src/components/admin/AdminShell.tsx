'use client';

import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useSession } from '@/providers/SessionProvider';

/** Tabs offered by the admin panel. */
export type AdminTab = 'overview' | 'catalog' | 'users';

/** Props of {@link AdminShell}. */
export interface AdminShellProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: ReactNode;
}

/** Tab definitions. */
const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Áttekintés' },
  { id: 'catalog', label: 'Tartalomkezelés' },
  { id: 'users', label: 'Felhasználók' },
];

/**
 * Frame of the administrator panel.
 *
 * @param props - Active tab, change handler and panel content.
 * @returns The admin layout.
 */
export function AdminShell({
  activeTab,
  onTabChange,
  children,
}: AdminShellProps): React.JSX.Element {
  const { user } = useSession();

  return (
    <div className="min-h-dvh bg-[var(--surface-base)]">
      <header className="border-b border-[var(--surface-border)] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Logo size="sm" href="/browse" />
          <span className="rounded bg-nova-red px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Admin
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-[var(--text-secondary)] sm:inline">
              {user?.email}
            </span>
            <ThemeToggle />
            <Button href="/browse" variant="secondary" size="sm">
              Vissza az appba
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-black tracking-tight">Adminisztráció</h1>

        <nav aria-label="Admin szekciók" className="mt-6 flex gap-2 border-b border-[var(--surface-border)]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-nova-red text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="py-8">{children}</div>
      </div>
    </div>
  );
}
