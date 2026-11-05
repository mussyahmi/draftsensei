import { test, expect } from 'vitest';
import { candidatesFor, isRisky, pickReason, picksFrom, rankPicks, matchupLines, safeRanked, type Gains } from '../lib/matchups';

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
  expect(candidatesFor('jungle', [], ['Saber'], lanes, [], {})).toEqual(['Jawhead']);
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
  expect(candidatesFor('jungle', [], [], lanes, ['Saber'], {})).toEqual(['Jawhead']);
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

test('a chip leads with the win rate, so every hero has a number and the order explains itself', () => {
  const base = { hero: 'Marcel', against: 0, alongside: 0, best: null, win: 0.575 };
  expect(pickReason(base)).toBe('57.5% win');
  expect(pickReason({ ...base, best: { enemy: 'Masha', gain: 0.002 } })).toBe('57.5% win, +0.2% vs Masha');
  expect(pickReason({ ...base, best: { enemy: 'Masha', gain: 0.002 }, partner: { ally: 'Kaja', gain: 0.036 } }, { win: 'menang', with: 'bersama', worst: 'terburuk vs', likely: 'mungkin' }))
    .toBe('57.5% menang, +0.2% vs Masha, +3.6% bersama Kaja');
});

const firstWins = new Map([['Marcel', 0.575], ['Diggie', 0.55], ['Gloo', 0.54]]);

test('a strong hero with a hard counter ranks below one that is safer', () => {
  const counters = new Map<string, Gains>([
    ['Marcel', new Map([['Angela', 0.047], ['Floryn', 0.01]])],
    ['Diggie', new Map([['Nana', 0.005]])],
    ['Gloo', new Map([['Estes', 0.03]])],
  ]);
  const ranked = safeRanked(['Marcel', 'Diggie', 'Gloo'], firstWins, counters);
  expect(ranked.map((r) => r.hero)).toEqual(['Diggie', 'Gloo']);
});

test('a banned hero is no threat to a first pick', () => {
  const counters = new Map<string, Gains>([['Marcel', new Map([['Angela', 0.047], ['Floryn', 0.01]])]]);
  expect(safeRanked(['Marcel'], firstWins, counters, new Set(['Angela']))[0].worst).toEqual({ enemy: 'Floryn', gain: -0.01 });
});

test('nothing beating a hero means no worst matchup, and it never counts itself', () => {
  const counters = new Map<string, Gains>([['Diggie', new Map([['Diggie', 0.5], ['Nana', -0.02]])]]);
  expect(safeRanked(['Diggie'], firstWins, counters)[0].worst).toBeNull();
});

test('a hero whose counters did not load goes after those that did, and a hero with no win rate is left out', () => {
  const counters = new Map<string, Gains>([['Gloo', new Map([['Estes', 0.03]])]]);
  const ranked = safeRanked(['Marcel', 'Gloo', 'Made Up'], firstWins, counters);
  expect(ranked.map((r) => r.hero)).toEqual(['Gloo', 'Marcel']);
  expect(ranked[1].worst).toBeUndefined();
});

test('a first pick chip names its worst matchup', () => {
  const r = { hero: 'Marcel', against: 0, alongside: 0, best: null, win: 0.575, worst: { enemy: 'Angela', gain: -0.047 } };
  expect(pickReason(r)).toBe('57.5% win, worst vs Angela -4.7%');
  expect(pickReason({ ...r, worst: null })).toBe('57.5% win');
});

test('a hero with a counter worse than 4% is not a safe first pick', () => {
  const counters = new Map<string, Gains>([
    ['Marcel', new Map([['Angela', 0.047]])],
    ['Diggie', new Map([['Estes', 0.04]])],
  ]);
  const ranked = safeRanked(['Marcel', 'Diggie'], firstWins, counters);
  expect(ranked.map((r) => r.hero)).toEqual(['Diggie']);
  expect(ranked.some(isRisky)).toBe(false);
});

test('with no safe hero left, the risky ones stay and say so', () => {
  const counters = new Map<string, Gains>([['Marcel', new Map([['Angela', 0.047]])]]);
  const ranked = safeRanked(['Marcel'], firstWins, counters);
  expect(ranked.map((r) => r.hero)).toEqual(['Marcel']);
  expect(ranked.some(isRisky)).toBe(true);
});

test('a hero whose counters did not load stays behind the safe ones', () => {
  const counters = new Map<string, Gains>([['Gloo', new Map([['Estes', 0.03]])]]);
  expect(safeRanked(['Marcel', 'Gloo'], firstWins, counters).map((r) => r.hero)).toEqual(['Gloo', 'Marcel']);
});

const likelyLing = new Map([['Ling', new Map<string, number>([['Saber', -0.04], ['Jawhead', 0.03]])]]);

test('a hero a likely enemy pick beats moves down, at half the weight of a real pick', () => {
  const vsTigreal: Gains = new Map([['Saber', 0.015], ['Jawhead', 0]]);
  const real = new Map([['Tigreal', vsTigreal]]);
  const before = rankPicks(['Jawhead', 'Saber'], real, new Map());
  expect(before.map((r) => r.hero)).toEqual(['Saber', 'Jawhead']);
  const after = rankPicks(['Jawhead', 'Saber'], real, new Map(), undefined, new Map(), [], likelyLing);
  expect(after.map((r) => r.hero)).toEqual(['Jawhead', 'Saber']);
  expect(after[1].likely).toEqual({ enemy: 'Ling', gain: -0.04 });
  // Winning into a likely pick earns nothing: it may never come.
  expect(after[0].likely).toBeUndefined();
});

test('a likely pick does not outweigh a much better matchup on the board', () => {
  const vsTigreal: Gains = new Map([['Saber', 0.05], ['Jawhead', 0]]);
  const ranked = rankPicks(['Jawhead', 'Saber'], new Map([['Tigreal', vsTigreal]]), new Map(), undefined, new Map(), [], likelyLing);
  expect(ranked[0].hero).toBe('Saber');
});

test('a hero is never its own likely counter', () => {
  const ranked = rankPicks(['Ling'], enemies, new Map([['Tigreal', new Map([['Ling', 0.01]])]]), undefined, new Map(), [], new Map([['Ling', new Map([['Ling', -0.5]])]]));
  expect(ranked[0].likely).toBeUndefined();
});

test('the chip names a likely counter only when it is big enough, and says likely', () => {
  const r = { hero: 'Saber', against: 0, alongside: 0, best: null, win: 0.52, likely: { enemy: 'Ling', gain: -0.031 } };
  expect(pickReason(r)).toBe('52.0% win, -3.1% vs Ling (likely)');
  expect(pickReason({ ...r, likely: { enemy: 'Ling', gain: -0.01 } })).toBe('52.0% win');
  expect(pickReason({ ...r, win: undefined })).toBe('-3.1% vs Ling (likely)');
});

test('the AI is told a likely counter is only a maybe', () => {
  const r = { hero: 'Saber', against: 0, alongside: 0, best: null, likely: { enemy: 'Ling', gain: -0.031 } };
  expect(matchupLines([r], false)[0]).toContain('-3.1% vs ling if the enemy picks it');
});

test('the browser can name at most three likely picks', () => {
  const board = { lane: 'exp', enemy: [], team: [], pool: [], likely: ['A', 'B', 'C', 'D'] };
  expect(picksFrom(board)?.likely).toEqual(['A', 'B', 'C']);
  expect(picksFrom({ ...board, likely: [] })).not.toHaveProperty('likely');
});
