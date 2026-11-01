import { test, expect, vi, afterEach } from 'vitest';
import { POST } from '../app/api/picks/route';
import { forgetArena } from '../lib/arena';
import { pickReason } from '../lib/matchups';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

// Sun (27) is the enemy, Tigreal (60) is on my team, three roamers compete.
const stats = (url: string) => {
  const hero = (hero_id: number, name: string) => ({ data: { hero_id, hero: { data: { name } } } });
  const table = (rows: [number, number][]) => ({
    data: { records: [{ data: { sub_hero: rows.map(([heroid, increase_win_rate]) => ({ heroid, increase_win_rate })) } }] },
  });
  if (url.includes('/heroes?size')) {
    return { data: { records: [hero(27, 'Sun'), hero(60, 'Tigreal'), hero(1, 'Franco'), hero(2, 'Akai'), hero(3, 'Diggie')] } };
  }
  if (url.includes('/27/counters')) return table([[1, 0.01], [2, -0.02], [3, 0.031]]);
  if (url.includes('/60/teammates')) return table([[1, 0.005], [2, 0.04]]);
  return null;
};

const post = (body: unknown) =>
  POST(new Request('http://x/api/picks', { method: 'POST', body: JSON.stringify(body) }));

test('the best three for my lane come back from match data alone', async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(JSON.stringify(stats(url))));
  const res = await post({ picks: { lane: 'roam', enemy: ['Sun'], team: ['Tigreal'], pool: [] } });
  const ranked = await res.json();
  expect(ranked.map((r: { hero: string }) => r.hero)).toEqual(['Diggie', 'Akai', 'Franco']);
});

test('an empty board has nothing to rank', async () => {
  const res = await post({ picks: { lane: 'roam', enemy: [], team: [], pool: [] } });
  expect(await res.json()).toEqual([]);
});

test('a malformed board is refused', async () => {
  const res = await post({ picks: { lane: 'nowhere' } });
  expect(res.status).toBe(400);
});

test('the data source being down means no picks, not an error', async () => {
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  const res = await post({ picks: { lane: 'roam', enemy: ['Sun'], team: [], pool: [] } });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([]);
});

const ranked = { hero: 'Diggie', against: 0.03, alongside: 0.01, best: { enemy: 'Sun', gain: 0.031 } };

test('the reason names the biggest win into an enemy', () => {
  expect(pickReason({ ...ranked, opponent: { enemy: 'Layla', gain: 0.003 } })).toBe('+3.1% win vs Sun');
  expect(pickReason({ ...ranked, opponent: { enemy: 'Layla', gain: 0.04 } })).toBe('+4.0% win vs Layla');
});

test('on a tie the lane opponent is named', () => {
  expect(pickReason({ ...ranked, opponent: { enemy: 'Sun', gain: 0.031 } })).toBe('+3.1% win vs Sun');
});

test('a losing lane matchup gives way to the best counter', () => {
  expect(pickReason({ ...ranked, opponent: { enemy: 'Layla', gain: -0.01 } })).toBe('+3.1% win vs Sun');
});

test('with no counter, the reason is how it fits the team', () => {
  expect(pickReason({ ...ranked, best: null })).toBe('+1.0% win with team');
  expect(pickReason({ ...ranked, best: null, alongside: -0.01 })).toBeNull();
});
