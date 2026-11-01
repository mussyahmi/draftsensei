import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Bumping the version without writing its changelog entry, or the other way
// round, is the mistake this catches before a deploy.
const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('the latest version in the changelog is the one in package.json', () => {
  const { version } = JSON.parse(read('package.json'));
  const latest = read('CHANGELOG.md').match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];
  expect(latest).toBe(version);
});

test('each released version in the changelog carries its date', () => {
  const headings = read('CHANGELOG.md').match(/^## \[.*$/gm) ?? [];
  expect(headings.length).toBeGreaterThan(0);
  for (const h of headings) expect(h).toMatch(/^## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}$/);
});
