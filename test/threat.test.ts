import { test, expect, vi, afterEach } from 'vitest';
import { biggestThreats } from '../lib/threat';
import { POST } from '../app/api/threat/route';
import { forgetArena } from '../lib/arena';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

const against = new Map([
  ['Paquito', new Map([['Kalea', -0.03], ['Lesley', -0.01]])],
  ['Belerick', new Map([['Kalea', 0.01], ['Lesley', -0.02]])],
]);

test('the threat is the enemy hardest on the whole team, with who it hurts most', () => {
  expect(biggestThreats(['Kalea', 'Lesley'], ['Paquito', 'Belerick'], against)[0]).toEqual({
    enemy: 'Paquito',
    hero: 'Kalea',
    gain: -0.03,
  });
});

test('one big matchup does not outweigh an enemy hard on everyone', () => {
  const tables = new Map([
    ['A', new Map([['X', -0.03], ['Y', 0.03]])],
    ['B', new Map([['X', -0.015], ['Y', -0.015]])],
  ]);
  expect(biggestThreats(['X', 'Y'], ['A', 'B'], tables)[0].enemy).toBe('B');
});

test('when no enemy stands out, nobody is named', () => {
  const even = new Map([['A', new Map([['X', -0.002], ['Y', -0.003]])], ['B', new Map([['X', 0.02]])]]);
  expect(biggestThreats(['X', 'Y'], ['A', 'B'], even)).toEqual([]);
  expect(biggestThreats(['X'], ['A'], new Map())).toEqual([]);
});

test('two threats at most, hardest first, and only those that stand out', () => {
  const tables = new Map([
    ['A', new Map([['X', -0.05]])],
    ['B', new Map([['X', -0.03]])],
    ['C', new Map([['X', -0.02]])],
    ['D', new Map([['X', -0.001]])],
  ]);
  expect(biggestThreats(['X'], ['C', 'A', 'B', 'D'], tables).map((t) => t.enemy)).toEqual(['A', 'B']);
  expect(biggestThreats(['X'], ['C', 'D'], tables).map((t) => t.enemy)).toEqual(['C']);
});

const post = (body: unknown) =>
  POST(new Request('http://x/api/threat', { method: 'POST', body: JSON.stringify(body) }));

test('the route refuses made-up heroes, and says nothing when the data is down', async () => {
  expect((await post({ team: ['Made Up'], enemy: ['Nana'] })).status).toBe(400);
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  const res = await post({ team: ['Layla', 'Nana'], enemy: ['Saber'], rank: 'all' });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([]);
});
