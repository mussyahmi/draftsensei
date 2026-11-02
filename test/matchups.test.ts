import { test, expect } from 'vitest';
import { candidatesFor, rankPicks, matchupLines, type Gains } from '../lib/matchups';

// How much each hero's win rate moves against or alongside one picked hero.
const vsSun: Gains = new Map([['Jawhead', 0.039], ['Saber', 0.031], ['Natan', -0.052]]);
const vsEudora: Gains = new Map([['Jawhead', -0.01], ['Saber', 0.02]]);
const withTigreal: Gains = new Map([['Saber', 0.02], ['Natan', 0.01]]);

const enemies = new Map([['Sun', vsSun], ['Eudora', vsEudora]]);

test('picks rank by win rate gained against the enemy plus with my team', () => {
  const ranked = rankPicks(['Jawhead', 'Saber', 'Natan'], enemies, new Map([['Tigreal', withTigreal]]));
  expect(ranked.map((r) => r.hero)).toEqual(['Saber', 'Jawhead', 'Natan']);
  expect(ranked[0]).toEqual({
    hero: 'Saber',
    against: 0.051,
    alongside: 0.02,
    best: { enemy: 'Sun', gain: 0.031 },
    partner: { ally: 'Tigreal', gain: 0.02 },
    opponent: null,
  });
});

test('each pick names the enemy it does best into, or none if it gains on nobody', () => {
  const ranked = rankPicks(['Jawhead', 'Natan'], enemies, new Map());
  expect(ranked.find((r) => r.hero === 'Jawhead')?.best).toEqual({ enemy: 'Sun', gain: 0.039 });
  expect(ranked.find((r) => r.hero === 'Natan')?.best).toBeNull();
});

test('a hero missing from one table counts as no change there', () => {
  const [only] = rankPicks(['Jawhead'], new Map([['Sun', vsSun]]), new Map([['Tigreal', withTigreal]]));
  expect(only).toMatchObject({ hero: 'Jawhead', against: 0.039, alongside: 0 });
});

test('a hero with no data at all is left out rather than shown as neutral', () => {
  expect(rankPicks(['Layla', 'Saber'], new Map([['Sun', vsSun]]), new Map([['Tigreal', withTigreal]])).map((r) => r.hero))
    .toEqual(['Saber']);
});

test('candidates are heroes who play my lane, minus anyone already picked', () => {
  const lanes = { Jawhead: 'jungle', Saber: 'jungle', Sun: 'exp', Natan: 'gold' } as const;
  expect(candidatesFor('jungle', [], ['Saber'], lanes)).toEqual(['Jawhead']);
});

test('with a hero pool, only the pool is in the running', () => {
  const lanes = { Jawhead: 'jungle', Saber: 'jungle' } as const;
  expect(candidatesFor('jungle', ['Ling', 'Saber'], ['Saber'], lanes)).toEqual(['Ling']);
});

test('the prompt lines show each gain as a signed percentage, with the best matchup', () => {
  expect(matchupLines([
    { hero: 'Saber', against: 0.051, alongside: 0.02, best: { enemy: 'Sun', gain: 0.031 } },
    { hero: 'Natan', against: -0.052, alongside: 0, best: null },
  ], true)).toEqual([
    'saber: +5.1% vs enemy (best into sun +3.1%), +2.0% with my team',
    'natan: -5.2% vs enemy, +0.0% with my team',
  ]);
});

test('with no teammates picked yet, the lines leave the team part out', () => {
  expect(matchupLines([{ hero: 'Saber', against: 0.051, alongside: 0, best: null }], false))
    .toEqual(['saber: +5.1% vs enemy']);
});

test('the enemy in my lane counts double, and is named on the line', () => {
  // Jawhead and Saber gain the same overall, but Saber is better into Eudora,
  // the enemy in my lane, so Saber ranks first.
  const vsSun2: Gains = new Map([['Jawhead', 0.03], ['Saber', 0.01]]);
  const vsEudora2: Gains = new Map([['Jawhead', 0.0], ['Saber', 0.02]]);
  const ranked = rankPicks(['Jawhead', 'Saber'], new Map([['Sun', vsSun2], ['Eudora', vsEudora2]]), new Map(), 'Eudora');
  expect(ranked.map((r) => r.hero)).toEqual(['Saber', 'Jawhead']);
  expect(ranked[0].opponent).toEqual({ enemy: 'Eudora', gain: 0.02 });
  expect(matchupLines([ranked[0]], false)).toEqual([
    'saber: +3.0% vs enemy (best into eudora +2.0%), vs lane opponent eudora +2.0%',
  ]);
});

test('with no enemy in my lane yet, nobody is weighted', () => {
  const [r] = rankPicks(['Saber'], new Map([['Sun', vsSun]]), new Map(), undefined);
  expect(r.opponent).toBeNull();
});

test('a banned hero is not in the running', () => {
  const lanes = { Jawhead: 'jungle', Saber: 'jungle' } as const;
  expect(candidatesFor('jungle', [], [], lanes, ['Saber'])).toEqual(['Jawhead']);
});

test('a hero already winning more beats a weaker one with slightly bigger counters', () => {
  const vsSun: Gains = new Map([['Jawhead', 0.03], ['Saber', 0.01]]);
  const wins = new Map([['Jawhead', 0.46], ['Saber', 0.53]]);
  const ranked = rankPicks(['Jawhead', 'Saber'], new Map([['Sun', vsSun]]), new Map(), undefined, wins);
  expect(ranked.map((r) => r.hero)).toEqual(['Saber', 'Jawhead']);
  expect(ranked[0].win).toBe(0.53);
});

test('a hero with no win rate is ranked as if it wins half its games', () => {
  const vsSun: Gains = new Map([['Jawhead', 0.03], ['Saber', 0.01]]);
  const ranked = rankPicks(['Jawhead', 'Saber'], new Map([['Sun', vsSun]]), new Map(), undefined, new Map([['Saber', 0.51]]));
  expect(ranked.map((r) => r.hero)).toEqual(['Jawhead', 'Saber']);
  expect(ranked[0].win).toBeUndefined();
});

test('Gemini sees each hero win rate at my rank before its matchups', () => {
  expect(matchupLines([{ hero: 'Saber', against: 0.051, alongside: 0, best: null, win: 0.523 }], false))
    .toEqual(['saber: 52.3% win at my rank, +5.1% vs enemy']);
});
