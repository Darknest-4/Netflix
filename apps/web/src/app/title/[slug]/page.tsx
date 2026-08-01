import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  API_ROUTES,
  BRAND_NAME,
  MATURITY_LABELS,
  TitleKind,
  formatDuration,
  type TitleDetailDto,
} from '@nova/shared';

import { apiFetch, safeServerFetch } from '@/lib/api-client';
import { Artwork } from '@/components/catalog/Artwork';
import { MaturityBadge, NewBadge, OriginalBadge } from '@/components/catalog/MetaBadges';
import { EpisodeList } from '@/components/catalog/EpisodeList';
import { SimilarTitles } from '@/components/catalog/SimilarTitles';
import { TitleActions } from '@/components/catalog/TitleActions';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

/** Revalidate detail pages every ten minutes. */
export const revalidate = 600;

/**
 * Builds SEO metadata from the catalog entry.
 *
 * @param props.params - Route parameters containing the slug.
 * @returns Metadata for the detail page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = await safeServerFetch<TitleDetailDto | null>(
    API_ROUTES.catalog.titleBySlug(slug),
    null,
  );

  if (!title) {
    return { title: 'Tartalom' };
  }

  const kindLabel = title.kind === TitleKind.SERIES ? 'sorozat' : 'film';

  return {
    title: title.name,
    description: title.synopsis.slice(0, 160),
    alternates: { canonical: `/title/${title.slug}` },
    openGraph: {
      title: `${title.name} — ${BRAND_NAME}`,
      description: title.synopsis.slice(0, 200),
      type: 'video.other',
      url: `/title/${title.slug}`,
    },
    other: {
      'og:video:release_date': String(title.releaseYear),
      'nova:kind': kindLabel,
    },
  };
}

/**
 * Movie and series detail page.
 *
 * Server rendered for SEO, with a JSON-LD block so search engines can present
 * it as rich media, and client components only where interaction is needed.
 *
 * @param props.params - Route parameters containing the slug.
 * @returns The page element.
 */
export default async function TitleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;

  let title: TitleDetailDto;
  try {
    title = await apiFetch<TitleDetailDto>(API_ROUTES.catalog.titleBySlug(slug), {
      next: { revalidate },
    });
  } catch {
    notFound();
  }

  const isSeries = title.kind === TitleKind.SERIES;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': isSeries ? 'TVSeries' : 'Movie',
    name: title.name,
    description: title.synopsis,
    datePublished: String(title.releaseYear),
    genre: title.genres,
    contentRating: MATURITY_LABELS[title.maturityRating],
    actor: title.cast.map((name) => ({ '@type': 'Person', name })),
    director: title.directors.map((name) => ({ '@type': 'Person', name })),
    ...(isSeries ? { numberOfSeasons: title.seasons.length } : {}),
    ...(title.durationSeconds ? { duration: `PT${Math.round(title.durationSeconds / 60)}M` } : {}),
  };

  return (
    <>
      <SiteHeader />

      <main className="min-h-dvh pb-16">
        <script
          type="application/ld+json"
          // JSON-LD is generated from our own catalog data, never from user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <section className="relative isolate">
          <div className="absolute inset-0 -z-10">
            <Artwork
              artwork={title.artwork}
              ratio="wide"
              showWordmark={false}
              className="h-full min-h-[58vh]"
            />
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'var(--scrim)' }} />
          </div>

          <div className="flex min-h-[58vh] max-w-3xl flex-col justify-end gap-4 px-[var(--spacing-row-gutter)] pb-12 pt-32">
            {title.isOriginal && <OriginalBadge />}

            <h1 className="text-balance text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              {title.name}
            </h1>

            <p className="text-lg italic text-[var(--text-secondary)]">{title.tagline}</p>

            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
              <span className="font-bold text-success">{title.matchScore}% egyezés</span>
              <span>{title.releaseYear}</span>
              <MaturityBadge rating={title.maturityRating} />
              <span>
                {isSeries
                  ? `${title.seasons.length} évad`
                  : title.durationSeconds
                    ? formatDuration(title.durationSeconds)
                    : ''}
              </span>
              {title.isNew && <NewBadge />}
            </div>

            <TitleActions title={title} />
          </div>
        </section>

        <div className="grid gap-10 px-[var(--spacing-row-gutter)] py-10 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Leírás</h2>
            <p className="text-pretty leading-relaxed text-[var(--text-secondary)]">
              {title.synopsis}
            </p>
          </div>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-[var(--text-muted)]">Szereplők</dt>
              <dd>{title.cast.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Rendező</dt>
              <dd>{title.directors.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Forgatókönyv</dt>
              <dd>{title.writers.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Műfaj</dt>
              <dd>{title.genres.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Hangsávok</dt>
              <dd>{title.audioLanguages.join(', ').toUpperCase()}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Feliratok</dt>
              <dd>{title.subtitleLanguages.join(', ').toUpperCase()}</dd>
            </div>
          </dl>
        </div>

        {isSeries && <EpisodeList title={title} />}

        <SimilarTitles titleIds={title.similarTitleIds} />
      </main>

      <SiteFooter />
    </>
  );
}
