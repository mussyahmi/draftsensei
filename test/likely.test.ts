import { test, expect } from 'vitest';
import { likelyEnemies } from '../lib/likely';
import type { Lane } from '../lib/draft';

const lanes: Record<string, Lane> = {
  Ling: 'jungle',
  Fanny: 'jungle',
  Hayabusa: 'jungle',
  Khufra: 'roam',
  Valir: 'mid',
  Kagura: 'mid',
};
const meta = (picks: Record<string, number>) =>
  Object.entries(picks).map(([hero, pick]) => ({ hero, win: 0.5, ban: 0, pick }));

test('names the most picked hero of each open lane first', () => {
  const { open, heroes } = likelyEnemies(
    meta({ Ling: 0.3, Fanny: 0.25, Khufra: 0.1 }),
    [{ hero: 'Valir', lane: 'mid' }, { hero: 'Tigreal', lane: 'exp' }, { hero: 'Layla', lane: 'gold' }],
    [],
    lanes,
  );
  expect(open).toEqual(['jungle', 'roam']);
  expect(heroes).toEqual(['Ling', 'Khufra', 'Fanny']);
});

test('one open lane can fill the list', () => {
  const { heroes } = likelyEnemies(
    meta({ Ling: 0.3, Fanny: 0.25, Hayabusa: 0.2, Khufra: 0.9 }),
    [{ hero: 'Tigreal', lane: 'roam' }],
    [],
    lanes,
  );
  expect(heroes).toEqual(['Ling', 'Fanny', 'Hayabusa']);
});

test('leaves out filled lanes, and anyone banned or already picked', () => {
  const { heroes } = likelyEnemies(
    meta({ Ling: 0.3, Fanny: 0.25, Hayabusa: 0.2, Valir: 0.5 }),
    [{ hero: 'Kagura', lane: 'mid' }],
    ['Ling', 'Fanny'],
    lanes,
  );
  expect(heroes).toEqual(['Hayabusa']);
});

test('a hero with no pick rate is no basis for a guess', () => {
  expect(likelyEnemies([{ hero: 'Ling', win: 0.5, ban: 0 }], [], [], lanes).heroes).toEqual([]);
});

test('a full enemy team has nobody left to guess', () => {
  const enemy = (['exp', 'mid', 'jungle', 'gold', 'roam'] as const).map((lane, i) => ({ hero: `H${i}`, lane }));
  expect(likelyEnemies(meta({ Ling: 0.3 }), enemy, [], lanes)).toEqual({ open: [], heroes: [] });
});
