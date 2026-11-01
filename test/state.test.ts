import { test, expect } from 'vitest';
import { newDraft, takenHeroes } from '../lib/draft';
import type { Draft } from '../lib/draft';

test('a new draft starts empty with mid lane, no bans and all ranks', () => {
  expect(newDraft()).toEqual({
    myLane: 'mid',
    picks: { enemy: [], team: [] },
    myHero: '',
    bans: [],
    rank: 'all',
  });
});

test('taken heroes covers picks on both sides, my own hero and bans', () => {
  const draft: Draft = {
    myLane: 'mid',
    picks: { enemy: [{ hero: 'Masha', lane: 'roam' }], team: [{ hero: 'Marcel', lane: 'roam' }] },
    myHero: 'Rafaela',
    bans: ['Ling'],
    rank: 'all',
  };
  expect(takenHeroes(draft).sort()).toEqual(['Ling', 'Marcel', 'Masha', 'Rafaela']);
});

test('taken heroes is empty for a fresh draft', () => {
  expect(takenHeroes(newDraft())).toEqual([]);
});
