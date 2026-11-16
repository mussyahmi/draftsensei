import { test, expect } from 'vitest';
import { isSettling, patchChange, PATCH, type Patch } from '../lib/patch';
import { HEROES } from '../lib/heroes';

const patch: Patch = {
  version: '9.9.9',
  date: '2026-11-11',
  heroes: { Xavier: { change: 'buff', note: 'Skill 1 damage up' }, Layla: { change: 'nerf' } },
};

test('a changed hero has its change, others none', () => {
  expect(patchChange('Xavier', patch)?.change).toBe('buff');
  expect(patchChange('Layla', patch)?.note).toBeUndefined();
  expect(patchChange('Tigreal', patch)).toBeUndefined();
});

test('numbers settle for a week after the patch day', () => {
  expect(isSettling(new Date('2026-11-10T23:00:00Z'), patch)).toBe(false);
  expect(isSettling(new Date('2026-11-11T00:00:00Z'), patch)).toBe(true);
  expect(isSettling(new Date('2026-11-17T23:59:00Z'), patch)).toBe(true);
  expect(isSettling(new Date('2026-11-18T00:00:00Z'), patch)).toBe(false);
});

test('no patch filled in means no notice', () => {
  expect(isSettling(new Date(), { version: '', date: '', heroes: {} })).toBe(false);
});

// A misspelled name would never match, and its mark would silently not show.
test('every hero in the patch file is a real hero', () => {
  const known = new Set(HEROES);
  expect(Object.keys(PATCH.heroes).filter((h) => !known.has(h))).toEqual([]);
});
