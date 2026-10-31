import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laneClashes } from '../public/draft.js';

test('no clash when every hero is in a different lane', () => {
  assert.deepEqual(laneClashes([
    { hero: 'Obsidia', lane: 'gold' },
    { hero: 'Nolan', lane: 'jungle' },
    { hero: 'Valir', lane: 'mid' },
  ]), []);
});

test('reports a lane two heroes are both in', () => {
  assert.deepEqual(laneClashes([
    { hero: 'Carmilla', lane: 'roam' },
    { hero: 'Belerick', lane: 'roam' },
    { hero: 'Valir', lane: 'mid' },
  ]), ['roam']);
});

test('reports every clashing lane, in lane order', () => {
  assert.deepEqual(laneClashes([
    { hero: 'Carmilla', lane: 'roam' },
    { hero: 'Belerick', lane: 'roam' },
    { hero: 'Valir', lane: 'mid' },
    { hero: 'Kagura', lane: 'mid' },
  ]), ['mid', 'roam']);
});

test('three heroes in one lane is still one clash', () => {
  assert.deepEqual(laneClashes([
    { hero: 'Carmilla', lane: 'roam' },
    { hero: 'Belerick', lane: 'roam' },
    { hero: 'Angela', lane: 'roam' },
  ]), ['roam']);
});

test('an empty side has no clashes', () => {
  assert.deepEqual(laneClashes([]), []);
});
