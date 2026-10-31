import { test, expect } from 'vitest';
import { HEROES, HERO_LANES } from '../lib/heroes';
import { LANES } from '../lib/draft';

const laneKeys = LANES.map((l) => l.key);

test('every hero has a default lane', () => {
  expect(HEROES.filter((h) => !HERO_LANES[h])).toEqual([]);
});

test('every default lane is one of the five lanes', () => {
  const bad = Object.entries(HERO_LANES).filter(([, lane]) => !laneKeys.includes(lane));
  expect(bad).toEqual([]);
});

test('no default lane is set for a hero that does not exist', () => {
  expect(Object.keys(HERO_LANES).filter((h) => !HEROES.includes(h))).toEqual([]);
});

test('the roster is the full 133 heroes', () => {
  expect(HEROES.length).toBe(133);
});

test('defaults follow how the heroes are actually played', () => {
  expect(HERO_LANES['Layla']).toBe('gold');
  expect(HERO_LANES['Tigreal']).toBe('roam');
  expect(HERO_LANES['Kagura']).toBe('mid');
  expect(HERO_LANES['Lancelot']).toBe('jungle');
  expect(HERO_LANES['Masha']).toBe('exp');
});
