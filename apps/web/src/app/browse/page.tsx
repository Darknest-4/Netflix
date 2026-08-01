import type { Metadata } from 'next';

import { BrowseExperience } from '@/components/catalog/BrowseExperience';

/** Browse page metadata (member area is not indexed). */
export const metadata: Metadata = {
  title: 'Kezdőlap',
  robots: { index: false, follow: false },
};

/**
 * Personalised home of the member area.
 *
 * @returns The page element.
 */
export default function BrowsePage(): React.JSX.Element {
  return <BrowseExperience pageTitle="Személyre szabott ajánlatok" />;
}
