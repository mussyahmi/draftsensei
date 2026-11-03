import { test, expect } from 'vitest';
import { HEROES, HERO_LANES, HERO_OTHER_LANES, playsLane } from '../lib/heroes';
import { candidatesFor } from '../lib/matchups';
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

test('other lanes name real heroes and real lanes, and never repeat the usual one', () => {
  for (const [hero, lanes] of Object.entries(HERO_OTHER_LANES)) {
    expect(HEROES).toContain(hero);
    expect(lanes).not.toContain(HERO_LANES[hero]);
  }
});

test('a hero is suggested in every lane it plays, and only those', () => {
  expect(candidatesFor('mid', [], [])).toContain('Selena');
  expect(candidatesFor('roam', [], [])).toContain('Selena');
  expect(candidatesFor('roam', [], [])).toContain('Gloo');
  expect(candidatesFor('mid', [], [])).toContain('Gusion');
  expect(candidatesFor('gold', [], [])).not.toContain('Selena');
});

test('another lane does not override a hero pool', () => {
  expect(candidatesFor('mid', ['Nana'], [])).toEqual(['Nana']);
});

test('a hero starts in the lane the game lists, and is still suggested in the one players also use', () => {
  expect(HERO_LANES['Roger']).toBe('jungle');
  expect(candidatesFor('gold', [], [])).toContain('Roger');
  expect(candidatesFor('jungle', [], [])).toContain('Roger');
});

test('a two lane hero starts in the lane the game lists first', () => {
  expect(HERO_LANES['Selena']).toBe('mid');
  expect(HERO_OTHER_LANES['Selena']).toEqual(['roam']);
});

test('a hero plays its usual lane and its other lanes, and no others', () => {
  expect(playsLane('Selena', 'mid')).toBe(true);
  expect(playsLane('Selena', 'roam')).toBe(true);
  expect(playsLane('Selena', 'gold')).toBe(false);
  expect(playsLane('Made Up', 'mid')).toBe(false);
});
