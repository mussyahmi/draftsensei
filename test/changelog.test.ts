import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseChangelog } from '../lib/changelog';

const md = `# Changelog

Intro paragraph that is not a release.

## Unreleased

### Added
- Not shipped yet.

## [0.2.0] - 2026-11-02

### Added
- Item icons from the \`official\` data.
- A bullet that runs on
  to a second line.

### Fixed
- Picked heroes are no longer suggested.

## [0.1.0] - 2026-10-31

### Added
- First version.
`;

test('released versions come out newest first, with dates and sections', () => {
  expect(parseChangelog(md)).toEqual([
    {
      version: '0.2.0',
      date: '2026-11-02',
      sections: [
        {
          heading: 'Added',
          items: ['Item icons from the official data.', 'A bullet that runs on to a second line.'],
        },
        { heading: 'Fixed', items: ['Picked heroes are no longer suggested.'] },
      ],
    },
    { version: '0.1.0', date: '2026-10-31', sections: [{ heading: 'Added', items: ['First version.'] }] },
  ]);
});

test('unreleased work stays out of what players see', () => {
  expect(parseChangelog(md).map((r) => r.version)).not.toContain('Unreleased');
});

test('the real changelog parses into at least one release', () => {
  const real = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  expect(parseChangelog(real).length).toBeGreaterThan(0);
});
