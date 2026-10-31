import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, HERO_LANES } from '../public/heroes.js';
import { LANES } from '../public/draft.js';

const laneKeys = LANES.map((l) => l.key);

test('every hero has a default lane', () => {
  const missing = HEROES.filter((h) => !HERO_LANES[h]);
  assert.deepEqual(missing, []);
});

test('every default lane is one of the five lanes', () => {
  const bad = Object.entries(HERO_LANES).filter(([, lane]) => !laneKeys.includes(lane));
  assert.deepEqual(bad, []);
});

test('no default lane is set for a hero that does not exist', () => {
  const unknown = Object.keys(HERO_LANES).filter((h) => !HEROES.includes(h));
  assert.deepEqual(unknown, []);
});

test('defaults follow how the heroes are actually played', () => {
  assert.equal(HERO_LANES['Layla'], 'gold');
  assert.equal(HERO_LANES['Tigreal'], 'roam');
  assert.equal(HERO_LANES['Kagura'], 'mid');
  assert.equal(HERO_LANES['Lancelot'], 'jungle');
  assert.equal(HERO_LANES['Masha'], 'exp');
});
