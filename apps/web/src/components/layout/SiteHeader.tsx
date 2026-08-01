'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { avatarGradient } from '@nova/shared';

import { Logo } from '@/components/brand/Logo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { useSession } from '@/providers/SessionProvider';

/** Primary navigation entries of the member area. */
const NAV_ITEMS = [
  { href: '/browse', label: 'Kezdőlap' },
  { href: '/series', label: 'Sorozatok' },
  { href: '/films', label: 'Filmek' },
  { href: '/new', label: 'Újdonságok' },
  { href: '/my-list', label: 'A listám' },
] as const;

/**
 * Sticky application header.
 *
 * Transparent over the billboard and solid once the page scrolls — the standard
 * streaming-app behaviour — with search, notifications, theme switch and the
 * profile menu on the right.
 *
 * @returns The header element.
 */
export function SiteHeader(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeProfile, profiles, selectProfile, logout } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [term, setTerm] = useState('');

  useEffect(() => {
    /** Toggles the solid background past 40 pixels of scroll. */
    const onScroll = (): void => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const avatar = avatarGradient(activeProfile?.avatarKey ?? 'nebula');

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? 'bg-[var(--surface-base)]/95 backdrop-blur' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="flex h-16 items-center gap-4 px-[var(--spacing-row-gutter)] sm:h-[68px]">
        <Logo size="sm" href="/browse" />

        <nav aria-label="Fő navigáció" className="hidden md:block">
          <ul className="flex items-center gap-5 text-sm">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`transition-colors hover:text-white ${
                      active ? 'font-semibold text-white' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (term.trim().length > 1) {
                router.push(`/search?q=${encodeURIComponent(term.trim())}`);
              }
            }}
            className="flex items-center"
          >
            <label htmlFor="global-search" className="sr-only">
              Keresés a katalógusban
            </label>
            <input
              id="global-search"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(term.length > 0)}
              placeholder={searchOpen ? 'Címek, emberek, műfajok' : ''}
              className={`h-9 rounded border bg-black/70 text-sm text-white transition-all duration-300 ease-[var(--ease-nova)] placeholder:text-[var(--text-muted)] ${
                searchOpen
                  ? 'w-44 border-[var(--surface-border)] px-3 sm:w-60'
                  : 'w-0 border-transparent bg-transparent px-0'
              }`}
            />
            <button
              type={searchOpen ? 'submit' : 'button'}
              onClick={() => {
                setSearchOpen(true);
                document.getElementById('global-search')?.focus();
              }}
              aria-label="Keresés"
              className="grid size-9 place-items-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
            >
              <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
                <path d="M10 4a6 6 0 1 0 3.5 10.9l4.8 4.8 1.4-1.4-4.8-4.8A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
              </svg>
            </button>
          </form>

          <ThemeToggle />
          <NotificationBell />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2"
            >
              <span
                className="grid size-8 place-items-center rounded text-xs font-bold text-white"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})`,
                }}
              >
                {(activeProfile?.name ?? user?.displayName ?? 'N').charAt(0).toUpperCase()}
              </span>
              <span aria-hidden="true" className="hidden text-xs sm:inline">
                ▾
              </span>
              <span className="sr-only">Profil menü</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 overflow-hidden rounded-md border border-[var(--surface-border)] bg-[var(--surface-overlay)] py-2 shadow-2xl"
              >
                {profiles.map((profile) => {
                  const gradient = avatarGradient(profile.avatarKey);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        selectProfile(profile.id);
                        setMenuOpen(false);
                        router.refresh();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-white/5"
                    >
                      <span
                        className="size-7 rounded"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                        }}
                      />
                      {profile.name}
                      {profile.isKids && (
                        <span className="ml-auto text-[10px] uppercase text-[var(--text-muted)]">
                          gyerek
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="my-2 border-t border-[var(--surface-border)]" />

                <Link
                  role="menuitem"
                  href="/profiles"
                  className="block px-4 py-2 text-sm hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  Profilok kezelése
                </Link>
                <Link
                  role="menuitem"
                  href="/account"
                  className="block px-4 py-2 text-sm hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  Fiók és előfizetés
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    role="menuitem"
                    href="/admin"
                    className="block px-4 py-2 text-sm text-nova-red hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin panel
                  </Link>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logout()}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                >
                  Kijelentkezés
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav aria-label="Mobil navigáció" className="border-t border-[var(--surface-border)] md:hidden">
        <ul className="flex items-center gap-4 overflow-x-auto px-[var(--spacing-row-gutter)] py-2 text-sm">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={pathname === item.href ? 'font-semibold text-white' : 'text-[var(--text-secondary)]'}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
