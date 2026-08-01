import type { Metadata } from 'next';

import { BrowseExperience } from '@/components/catalog/BrowseExperience';

/** Series page metadata. */
export const metadata: Metadata = {
  title: 'Sorozatok',
  robots: { index: false, follow: false },
};

/**
 * Series-only browse page.
 *
 * @returns The page element.
 */
export default function SeriesPage(): React.JSX.Element {
  return <BrowseExperience kind="SERIES" pageTitle="Sorozatok" />;
}
