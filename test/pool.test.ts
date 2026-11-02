import { test, expect } from 'vitest';
import { pickPrompt, newPool, poolFor } from '../lib/draft';
import type { Draft } from '../lib/draft';

const draft: Draft = {
  myLane: 'mid',
  picks: {
    enemy: [{ hero: 'Eudora', lane: 'mid' }],
    team: [{ hero: 'Lukas', lane: 'jungle' }],
  },
  myHero: '',
  bans: [],
  rank: 'all',
  lang: 'en',
};

test('a new pool has an empty list for every lane', () => {
  expect(newPool()).toEqual({ exp: [], mid: [], jungle: [], gold: [], roam: [] });
});

test('the pool for a lane comes back as written', () => {
  expect(poolFor({ ...newPool(), mid: ['Kagura', 'Lunox'] }, 'mid')).toEqual(['Kagura', 'Lunox']);
});

test('a missing pool reads as empty', () => {
  expect(poolFor(undefined, 'mid')).toEqual([]);
});

test('pick prompt limits suggestions to my heroes for that lane', () => {
  const pool = { ...newPool(), mid: ['Kagura', 'Lunox', 'Valentina'] };
  expect(pickPrompt(draft, pool)).toMatch(/\nonly suggest from my heroes: kagura, lunox, valentina$/);
});

test('pick prompt says nothing about my heroes when that lane has no pool', () => {
  const pool = { ...newPool(), gold: ['Beatrix'] };
  expect(pickPrompt(draft, pool)).not.toMatch(/only suggest/);
});

test('pick prompt is unchanged when no pool is given at all', () => {
  expect(pickPrompt(draft, undefined)).toBe(pickPrompt(draft));
});
