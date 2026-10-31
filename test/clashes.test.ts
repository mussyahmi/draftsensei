import { test, expect } from 'vitest';
import { laneClashes } from '../lib/draft';

test('no clash when every hero is in a different lane', () => {
  expect(laneClashes([
    { hero: 'Obsidia', lane: 'gold' },
    { hero: 'Nolan', lane: 'jungle' },
    { hero: 'Valir', lane: 'mid' },
  ])).toEqual([]);
});

test('reports a lane two heroes are both in', () => {
  expect(laneClashes([
    { hero: 'Carmilla', lane: 'roam' },
    { hero: 'Belerick', lane: 'roam' },
    { hero: 'Valir', lane: 'mid' },
  ])).toEqual(['roam']);
});

test('reports every clashing lane, in lane order', () => {
  expect(laneClashes([
    { hero: 'Carmilla', lane: 'roam' },
    { hero: 'Belerick', lane: 'roam' },
    { hero: 'Valir', lane: 'mid' },
    { hero: 'Kagura', lane: 'mid' },
  ])).toEqual(['mid', 'roam']);
});

test('three heroes in one lane is still one clash', () => {
  expect(laneClashes([
    { hero: 'Carmilla', lane: 'roam' },
    { hero: 'Belerick', lane: 'roam' },
    { hero: 'Angela', lane: 'roam' },
  ])).toEqual(['roam']);
});

test('an empty side has no clashes', () => {
  expect(laneClashes([])).toEqual([]);
});
