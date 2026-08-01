import type { Metadata } from 'next';

import { BrowseExperience } from '@/components/catalog/BrowseExperience';

/** Films page metadata. */
export const metadata: Metadata = {
  title: 'Filmek',
  robots: { index: false, follow: false },
};

/**
 * Movie-only browse page.
 *
 * @returns The page element.
 */
export default function FilmsPage(): React.JSX.Element {
  return <BrowseExperience kind="MOVIE" pageTitle="Filmek" />;
}
