import { test, expect } from 'vitest';
import { newDraft, takenHeroes } from '../lib/draft';
import type { Draft } from '../lib/draft';

test('a new draft starts empty with mid lane', () => {
  expect(newDraft()).toEqual({
    myLane: 'mid',
    picks: { enemy: [], team: [] },
    myHero: '',
  });
});

test('taken heroes covers picks on both sides and my own hero', () => {
  const draft: Draft = {
    myLane: 'mid',
    picks: { enemy: [{ hero: 'Masha', lane: 'roam' }], team: [{ hero: 'Marcel', lane: 'roam' }] },
    myHero: 'Rafaela',
  };
  expect(takenHeroes(draft).sort()).toEqual(['Marcel', 'Masha', 'Rafaela']);
});

test('taken heroes is empty for a fresh draft', () => {
  expect(takenHeroes(newDraft())).toEqual([]);
});
