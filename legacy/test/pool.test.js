import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPrompt, newPool, poolFor } from '../public/draft.js';

const draft = {
  myLane: 'mid',
  picks: {
    enemy: [{ hero: 'Eudora', lane: 'mid' }],
    team: [{ hero: 'Lukas', lane: 'jungle' }],
  },
  myHero: '',
};

test('a new pool has an empty list for every lane', () => {
  assert.deepEqual(newPool(), { exp: [], mid: [], jungle: [], gold: [], roam: [] });
});

test('the pool for a lane comes back as written', () => {
  assert.deepEqual(poolFor({ ...newPool(), mid: ['Kagura', 'Lunox'] }, 'mid'), ['Kagura', 'Lunox']);
});

test('a missing pool reads as empty', () => {
  assert.deepEqual(poolFor(undefined, 'mid'), []);
});

test('pick prompt limits suggestions to my heroes for that lane', () => {
  const pool = { ...newPool(), mid: ['Kagura', 'Lunox', 'Valentina'] };
  assert.match(pickPrompt(draft, pool), /\nonly suggest from my heroes: kagura, lunox, valentina$/);
});

test('pick prompt says nothing about my heroes when that lane has no pool', () => {
  const pool = { ...newPool(), gold: ['Beatrix'] };
  assert.doesNotMatch(pickPrompt(draft, pool), /only suggest/);
});

test('pick prompt is unchanged when no pool is given at all', () => {
  assert.equal(pickPrompt(draft, undefined), pickPrompt(draft));
});
