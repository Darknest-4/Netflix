import type { Metadata } from 'next';
import Link from 'next/link';
import {
  API_ROUTES,
  BRAND_NAME,
  BRAND_TAGLINE,
  PLANS,
  formatPrice,
  type TitleSummaryDto,
} from '@nova/shared';

import { safeServerFetch } from '@/lib/api-client';
import { Artwork } from '@/components/catalog/Artwork';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';

/** Landing page metadata. */
export const metadata: Metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description:
    'Korlátlan sorozat, film és dokumentumfilm. Nézd bárhol, mondd le bármikor. Az első 30 nap ingyenes.',
  alternates: { canonical: '/' },
};

/** Revalidate the marketing page hourly. */
export const revalidate = 3600;

/** Value propositions rendered in the feature grid. */
const FEATURES = [
  {
    title: 'Nézd a tévén',
    body: 'Smart TV, PlayStation, Xbox, Chromecast, Apple TV, Blu-ray lejátszó és még sok más.',
    icon: '📺',
  },
  {
    title: 'Töltsd le és nézd offline',
    body: 'Mentsd el a kedvenceidet, és nézd őket repülőn, vonaton, internet nélkül is.',
    icon: '⬇️',
  },
  {
    title: 'Nézd bárhol',
    body: 'Korlátlan tartalom telefonon, tableten, laptopon és tévén — felár nélkül.',
    icon: '🌍',
  },
  {
    title: 'Gyerekbarát profilok',
    body: 'Külön tér a gyerekeknek, szülői felügyelettel és korhatár-szűréssel.',
    icon: '🧸',
  },
] as const;

/**
 * Public landing page.
 *
 * A server component: the hero titles are fetched at build time and
 * revalidated hourly, so the page is fully static, crawlable and instant.
 *
 * @returns The landing page.
 */
export default async function LandingPage(): Promise<React.JSX.Element> {
  const trending = await safeServerFetch<TitleSummaryDto[]>(API_ROUTES.catalog.topTen, []);

  return (
    <>
      <header className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="grid h-full grid-cols-3 gap-1 opacity-45 sm:grid-cols-5">
            {trending.slice(0, 10).map((title) => (
              <Artwork key={title.id} artwork={title.artwork} ratio="poster" showWordmark={false} className="h-full" />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-[var(--surface-base)]" />
        </div>

        <nav className="flex items-center justify-between px-[var(--spacing-row-gutter)] py-6">
          <Logo size="md" href="/" />
          <div className="flex items-center gap-3">
            <Button href="/login" variant="secondary" size="sm">
              Bejelentkezés
            </Button>
          </div>
        </nav>

        <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          <h1 className="text-balance text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Korlátlan sorozat, film és dokumentumfilm.
          </h1>
          <p className="mt-5 text-lg text-[var(--text-secondary)] sm:text-xl">
            Nézd bárhol. Mondd le bármikor. Az első 30 nap a miénk.
          </p>

          <form
            action="/signup"
            className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="landing-email" className="sr-only">
              E-mail cím
            </label>
            <input
              id="landing-email"
              name="email"
              type="email"
              required
              placeholder="E-mail cím"
              className="h-14 flex-1 rounded-md border border-[var(--surface-border)] bg-black/60 px-4 text-base text-white placeholder:text-[var(--text-muted)]"
            />
            <Button type="submit" size="lg">
              Kezdjük →
            </Button>
          </form>
        </div>
      </header>

      <main className="px-[var(--spacing-row-gutter)]">
        <section aria-labelledby="features" className="mx-auto max-w-6xl border-t border-[var(--surface-border)] py-16">
          <h2 id="features" className="mb-10 text-center text-3xl font-black tracking-tight">
            Miért a {BRAND_NAME}?
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6"
              >
                <span aria-hidden="true" className="text-3xl">
                  {feature.icon}
                </span>
                <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {trending.length > 0 && (
          <section aria-labelledby="trending" className="mx-auto max-w-6xl border-t border-[var(--surface-border)] py-16">
            <h2 id="trending" className="mb-8 text-3xl font-black tracking-tight">
              Népszerű most a {BRAND_NAME}-n
            </h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {trending.slice(0, 10).map((title, index) => (
                <li key={title.id}>
                  <Link href={`/title/${title.slug}`} className="group block">
                    <div className="overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-[1.04]">
                      <Artwork artwork={title.artwork} ratio="poster" />
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">
                      <span className="mr-1 text-[var(--text-muted)]">{index + 1}.</span>
                      {title.name}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="plans" className="mx-auto max-w-6xl border-t border-[var(--surface-border)] py-16">
          <h2 id="plans" className="mb-3 text-center text-3xl font-black tracking-tight">
            Válassz csomagot
          </h2>
          <p className="mb-10 text-center text-[var(--text-secondary)]">
            Bármikor válthatsz vagy lemondhatsz. Reklámok nélkül, mindig.
          </p>

          <ul className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <li
                key={plan.tier}
                className={`flex flex-col rounded-xl border p-7 ${
                  plan.tier === 'STANDARD'
                    ? 'border-nova-red bg-[var(--surface-raised)] shadow-[0_0_0_1px_var(--color-nova-red)]'
                    : 'border-[var(--surface-border)] bg-[var(--surface-raised)]'
                }`}
              >
                {plan.tier === 'STANDARD' && (
                  <span className="mb-3 w-fit rounded bg-nova-red px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    Legnépszerűbb
                  </span>
                )}
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="mt-2 text-3xl font-black">
                  {formatPrice(plan.priceMinor, plan.currency)}
                  <span className="text-base font-medium text-[var(--text-muted)]"> / hó</span>
                </p>
                <dl className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
                  <div className="flex justify-between">
                    <dt>Képminőség</dt>
                    <dd className="font-medium text-[var(--text-primary)]">{plan.maxQuality}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Egyidejű eszközök</dt>
                    <dd className="font-medium text-[var(--text-primary)]">{plan.maxStreams}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Profilok</dt>
                    <dd className="font-medium text-[var(--text-primary)]">{plan.maxProfiles}</dd>
                  </div>
                </dl>
                <ul className="mt-5 flex-1 space-y-1.5 text-sm text-[var(--text-secondary)]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden="true" className="text-success">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button href={`/signup?plan=${plan.tier}`} className="mt-6" fullWidth>
                  Kipróbálom
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq" className="mx-auto max-w-3xl border-t border-[var(--surface-border)] py-16">
          <h2 id="faq" className="mb-8 text-center text-3xl font-black tracking-tight">
            Gyakori kérdések
          </h2>
          <FaqAccordion />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
