import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { HeroesPage } from '@/components/heroes-page';
import { parseChangelog } from '@/lib/changelog';

export const metadata: Metadata = { title: 'Heroes | DraftSensei' };

export default function Page() {
  // Read at build time, the same as the draft page.
  const releases = parseChangelog(readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8'));
  return <HeroesPage releases={releases} />;
}
