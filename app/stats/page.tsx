import type { Metadata } from 'next';
import { StatsPage } from '@/components/stats-page';

// Private: linked from nowhere, and kept out of search results.
export const metadata: Metadata = { title: 'Stats | DraftSensei', robots: { index: false, follow: false } };

export default function Page() {
  return <StatsPage />;
}
