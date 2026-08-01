import Link from 'next/link';
import { BRAND_NAME } from '@nova/shared';

/** Footer link groups. */
const LINK_GROUPS = [
  {
    heading: 'Nézd',
    links: [
      { href: '/browse', label: 'Kezdőlap' },
      { href: '/series', label: 'Sorozatok' },
      { href: '/films', label: 'Filmek' },
      { href: '/new', label: 'Újdonságok' },
    ],
  },
  {
    heading: 'Fiók',
    links: [
      { href: '/account', label: 'Fiókom' },
      { href: '/account/subscription', label: 'Előfizetés' },
      { href: '/profiles', label: 'Profilok' },
      { href: '/login', label: 'Bejelentkezés' },
    ],
  },
  {
    heading: 'Támogatás',
    links: [
      { href: '/help', label: 'Súgóközpont' },
      { href: '/help#devices', label: 'Támogatott eszközök' },
      { href: '/help#accessibility', label: 'Akadálymentesség' },
      { href: '/help#contact', label: 'Kapcsolat' },
    ],
  },
  {
    heading: 'Jogi',
    links: [
      { href: '/legal/terms', label: 'Felhasználási feltételek' },
      { href: '/legal/privacy', label: 'Adatkezelés' },
      { href: '/legal/cookies', label: 'Sütik' },
      { href: '/legal/impressum', label: 'Impresszum' },
    ],
  },
] as const;

/**
 * Global site footer.
 *
 * @returns The footer element.
 */
export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="mt-16 border-t border-[var(--surface-border)] px-[var(--spacing-row-gutter)] py-12 text-sm text-[var(--text-muted)]">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {LINK_GROUPS.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
              {group.heading}
            </h2>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-[var(--text-primary)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-6xl text-xs">
        © {new Date().getFullYear()} {BRAND_NAME} Streaming. Minden tartalom, dizájn és forráskód
        saját fejlesztés.
      </p>
    </footer>
  );
}
