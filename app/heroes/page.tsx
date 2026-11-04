import type { Metadata } from 'next';
import { HeroesPage } from '@/components/heroes-page';

export const metadata: Metadata = { title: 'Heroes | DraftSensei' };

export default function Page() {
  return <HeroesPage />;
}
