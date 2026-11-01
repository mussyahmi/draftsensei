import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DraftHelper } from '@/components/draft-helper';
import { parseChangelog } from '@/lib/changelog';

export default function Page() {
  // Read at build time, so the deployed page carries its own changelog.
  const releases = parseChangelog(readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8'));
  return <DraftHelper releases={releases} />;
}
