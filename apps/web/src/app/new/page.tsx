import type { Metadata } from 'next';
import { API_ROUTES, type TitleSummaryDto } from '@nova/shared';

import { safeServerFetch } from '@/lib/api-client';
import { NewAndPopularTabs } from '@/components/catalog/NewAndPopularTabs';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

/** New & popular page metadata. */
export const metadata: Metadata = {
  title: 'Újdonságok',
  description: 'A legfrissebb NOVA premierek, a most felkapott címek és a saját gyártású sorozatok.',
  alternates: { canonical: '/new' },
};

/** Revalidate every ten minutes. */
export const revalidate = 600;

/** Payload of the new & popular endpoint. */
interface NewAndPopular {
  newReleases: TitleSummaryDto[];
  trending: TitleSummaryDto[];
  originals: TitleSummaryDto[];
}

/**
 * "Újdonságok és népszerű" page.
 *
 * Rendered on the server so the sections are crawlable and cached at the edge;
 * only the tab switching is client side.
 *
 * @returns The page element.
 */
export default async function NewAndPopularPage(): Promise<React.JSX.Element> {
  const data = await safeServerFetch<NewAndPopular>(API_ROUTES.catalog.newAndPopular, {
    newReleases: [],
    trending: [],
    originals: [],
  });

  return (
    <>
      <SiteHeader />
      <main className="min-h-dvh px-[var(--spacing-row-gutter)] pb-16 pt-28">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Újdonságok és népszerű</h1>
        <NewAndPopularTabs
          newReleases={data.newReleases}
          trending={data.trending}
          originals={data.originals}
        />
      </main>
      <SiteFooter />
    </>
  );
}
