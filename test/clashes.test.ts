import { test, expect } from 'vitest';
import { isEmptyDraft, laneClashes, moveToLane, newDraft } from '../lib/draft';

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

const three = [
  { hero: 'Aulus', lane: 'jungle' as const },
  { hero: 'Kalea', lane: 'exp' as const },
  { hero: 'Lesley', lane: 'gold' as const },
];

test('moving to a free lane moves only that hero', () => {
  expect(moveToLane(three, 1, 'roam').map((p) => p.lane)).toEqual(['jungle', 'roam', 'gold']);
});

test('moving to a taken lane swaps the two heroes, so no clash appears', () => {
  const moved = moveToLane(three, 1, 'gold');
  expect(moved.map((p) => p.lane)).toEqual(['jungle', 'gold', 'exp']);
  expect(laneClashes(moved)).toEqual([]);
});

test('choosing the lane a hero is already in changes nothing', () => {
  expect(moveToLane(three, 1, 'exp')).toEqual(three);
});

test('with two heroes already in the lane, only one swaps out, so the warning stays', () => {
  const clashed = [...three, { hero: 'Layla', lane: 'gold' as const }];
  expect(laneClashes(moveToLane(clashed, 1, 'gold'))).toEqual(['gold']);
  expect(moveToLane(clashed, 3, 'exp').map((p) => p.lane)).toEqual(['jungle', 'gold', 'gold', 'exp']);
});

test('a draft is empty only with no hero, bans or picks, whatever the lane or rank', () => {
  expect(isEmptyDraft({ ...newDraft(), myLane: 'roam', rank: 'glory' })).toBe(true);
  expect(isEmptyDraft({ ...newDraft(), myHero: 'Nana' })).toBe(false);
  expect(isEmptyDraft({ ...newDraft(), bans: ['Nana'] })).toBe(false);
  expect(isEmptyDraft({ ...newDraft(), picks: { team: [], enemy: [{ hero: 'Nana', lane: 'mid' }] } })).toBe(false);
});
