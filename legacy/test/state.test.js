import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDraft, takenHeroes } from '../public/draft.js';

test('a new draft starts empty with mid lane', () => {
  assert.deepEqual(newDraft(), {
    myLane: 'mid',
    picks: { enemy: [], team: [] },
    myHero: '',
  });
});

test('taken heroes covers picks on both sides and my own hero', () => {
  const draft = {
    myLane: 'mid',
    picks: { enemy: [{ hero: 'Masha', lane: 'roam' }], team: [{ hero: 'Marcel', lane: 'roam' }] },
    myHero: 'Rafaela',
  };
  assert.deepEqual(takenHeroes(draft).sort(), ['Marcel', 'Masha', 'Rafaela']);
});

test('taken heroes is empty for a fresh draft', () => {
  assert.deepEqual(takenHeroes(newDraft()), []);
});
