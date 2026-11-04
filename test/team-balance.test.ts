import { test, expect } from 'vitest';
import { HEROES } from '../lib/heroes';
import { HERO_PROFILES } from '../lib/hero-profiles';
import { enemyDamage, fillsGaps, offLane, teamGaps, tellingFills } from '../lib/team-balance';
import { matchupLines, rankPicks, type Gains } from '../lib/matchups';

test('every hero has a role and a damage type', () => {
  expect(HEROES.filter((h) => !HERO_PROFILES[h]?.roles.length)).toEqual([]);
});

test('a team of three with no tank and only physical damage is told so', () => {
  expect(teamGaps(['Layla', 'Hayabusa', 'Saber'])).toEqual(['tank', 'magic']);
});

test('a balanced team has no gaps', () => {
  expect(teamGaps(['Tigreal', 'Nana', 'Layla'])).toEqual([]);
});

test('a mixed damage hero counts as both kinds', () => {
  expect(teamGaps(['Tigreal', 'Esmeralda', 'Eudora'])).toEqual([]);
});

test('two heroes are too few to judge, and a full team can no longer change', () => {
  expect(teamGaps(['Layla', 'Hayabusa'])).toEqual([]);
  expect(teamGaps(['Layla', 'Hayabusa', 'Saber', 'Natalia', 'Lancelot'])).toEqual([]);
});

test('a hero with no profile raises no alarm', () => {
  expect(teamGaps(['Layla', 'Hayabusa', 'Brand New'])).toEqual([]);
});

test('a hero fills only the gaps it brings', () => {
  expect(fillsGaps('Tigreal', ['tank', 'magic'])).toEqual(['tank']);
  expect(fillsGaps('Nana', ['tank', 'magic'])).toEqual(['magic']);
  expect(fillsGaps('Layla', ['tank', 'magic'])).toEqual([]);
});

test('filling a gap splits a close matchup but does not beat a far better one', () => {
  const close: Gains = new Map([['Tigreal', 0.01], ['Layla', 0.02]]);
  expect(rankPicks(['Tigreal', 'Layla'], new Map([['Sun', close]]), new Map(), undefined, new Map(), ['tank']).map((r) => r.hero))
    .toEqual(['Tigreal', 'Layla']);
  const far: Gains = new Map([['Tigreal', 0.01], ['Layla', 0.06]]);
  expect(rankPicks(['Tigreal', 'Layla'], new Map([['Sun', far]]), new Map(), undefined, new Map(), ['tank']).map((r) => r.hero))
    .toEqual(['Layla', 'Tigreal']);
});

test('Gemini is told what a hero adds to my team', () => {
  const [r] = rankPicks(['Tigreal'], new Map([['Sun', new Map([['Tigreal', 0.01]])]]), new Map(), undefined, new Map(), ['tank']);
  expect(r.fills).toEqual(['tank']);
  expect(matchupLines([r], false)[0]).toContain('adds the tank my team is missing');
});

test('a gap only sets heroes apart when some of them do not fill it', () => {
  expect(tellingFills([['magic'], ['magic'], ['magic']])).toEqual(new Set());
  expect(tellingFills([['tank'], undefined, ['tank']])).toEqual(new Set(['tank']));
  expect(tellingFills([['tank', 'magic'], ['magic']])).toEqual(new Set(['tank']));
  expect(tellingFills([undefined, undefined])).toEqual(new Set());
});

test('an enemy team clearly one kind of damage is called out', () => {
  expect(enemyDamage(['Layla', 'Hayabusa', 'Saber'])).toEqual({ physical: 3, magic: 0, mixed: 0, lean: 'physical' });
  expect(enemyDamage(['Nana', 'Eudora', 'Kagura', 'Layla'])).toEqual({ physical: 1, magic: 3, mixed: 0, lean: 'magic' });
});

test('a close split, or too few heroes, says nothing', () => {
  expect(enemyDamage(['Layla', 'Hayabusa', 'Saber', 'Nana', 'Eudora'])).toBeNull();
  expect(enemyDamage(['Layla', 'Hayabusa'])).toBeNull();
  expect(enemyDamage([])).toBeNull();
});

test('mixed damage heroes favour neither side', () => {
  expect(enemyDamage(['Layla', 'Hayabusa', 'Esmeralda', 'Bane'])).toBeNull();
  expect(enemyDamage(['Layla', 'Hayabusa', 'Saber', 'Esmeralda'])).toEqual({ physical: 3, magic: 0, mixed: 1, lean: 'physical' });
});

test('a hero with no profile is left out of the count', () => {
  expect(enemyDamage(['Layla', 'Hayabusa', 'Brand New'])).toBeNull();
});

test('a hero out of every lane the game lists is flagged, with where it usually plays', () => {
  expect(offLane([{ hero: 'Kalea', lane: 'exp' }])).toEqual([{ hero: 'Kalea', lane: 'exp', usual: 'roam' }]);
});

test('a hero in its usual lane or another listed lane is fine', () => {
  expect(offLane([{ hero: 'Kalea', lane: 'roam' }])).toEqual([]);
  expect(offLane([{ hero: 'Selena', lane: 'mid' }, { hero: 'Selena', lane: 'roam' }])).toEqual([]);
});

test('a hero with no known lane raises no alarm', () => {
  expect(offLane([{ hero: 'Brand New', lane: 'mid' }])).toEqual([]);
});
