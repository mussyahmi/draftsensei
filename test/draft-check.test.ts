import { test, expect, vi, afterEach } from 'vitest';
import { draftCheck } from '../lib/draft-check';
import { POST } from '../app/api/draft-check/route';
import { forgetArena } from '../lib/arena';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

const team = ['Khufra', 'Chou', 'Kagura', 'Moskov', 'Harith'];
const enemy = ['Rafaela', 'Selena', 'Bruno', 'Nolan', 'Kalea'];
const base = {
  team,
  enemy,
  me: 'Khufra',
  opponent: 'Rafaela',
  wins: new Map([['Khufra', 0.54], ['Rafaela', 0.5]]),
  against: new Map([
    ['Rafaela', new Map([['Khufra', 0.012], ['Moskov', -0.03]])],
    ['Selena', new Map([['Khufra', 0.016]])],
  ]),
  alongside: new Map([['Chou', new Map([['Kagura', 0.02], ['Khufra', 0.01]])]]),
};

test('my lane is my hero against the enemy there', () => {
  expect(draftCheck(base).lane).toEqual({ me: 'Khufra', enemy: 'Rafaela', gain: 0.012 });
});

test('no enemy in my lane, or no number for it, leaves the lane out', () => {
  expect(draftCheck({ ...base, opponent: null }).lane).toBeNull();
  expect(draftCheck({ ...base, opponent: 'Kalea' }).lane).toBeNull();
});

test('team strength averages only the win rates it has', () => {
  expect(draftCheck(base).strength).toEqual({ team: 0.54, enemy: 0.5 });
  expect(draftCheck({ ...base, wins: new Map() }).strength).toBeNull();
});

test('counters add up, and name the biggest for and against', () => {
  const c = draftCheck(base).counters!;
  expect(c.total).toBeCloseTo(-0.002);
  expect(c.best).toEqual({ hero: 'Khufra', enemy: 'Selena', gain: 0.016 });
  expect(c.worst).toEqual({ hero: 'Moskov', enemy: 'Rafaela', gain: -0.03 });
});

test('with no winning matchup there is no best, and no data means no counters', () => {
  const losing = new Map([['Rafaela', new Map([['Khufra', -0.01]])]]);
  expect(draftCheck({ ...base, against: losing }).counters!.best).toBeNull();
  expect(draftCheck({ ...base, against: new Map() }).counters).toBeNull();
});

test('the best combo is the biggest real gain between teammates', () => {
  expect(draftCheck(base).combo).toEqual({ a: 'Chou', b: 'Kagura', gain: 0.02 });
  const none = new Map([['Chou', new Map([['Kagura', -0.01]])]]);
  expect(draftCheck({ ...base, alongside: none }).combo).toBeNull();
});

test('a hero never combos with itself', () => {
  const self = new Map([['Chou', new Map([['Chou', 0.5]])]]);
  expect(draftCheck({ ...base, alongside: self }).combo).toBeNull();
});

test('damage counts both teams', () => {
  const { damage } = draftCheck(base);
  expect(damage.team.physical + damage.team.magic + damage.team.mixed).toBe(5);
  expect(damage.enemy.physical + damage.enemy.magic + damage.enemy.mixed).toBe(5);
});

const post = (body: unknown) =>
  POST(new Request('http://x/api/draft-check', { method: 'POST', body: JSON.stringify(body) }));

test('the route refuses teams that are not full or not real heroes', async () => {
  expect((await post({ team: ['Khufra'], enemy })).status).toBe(400);
  expect((await post({ team: [...team.slice(0, 4), 'Made Up'], enemy })).status).toBe(400);
});

test('the data source being down still answers, with what needs no data', async () => {
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  const res = await post({ team, enemy, me: 'Khufra', opponent: 'Rafaela', rank: 'all' });
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body.lane).toBeNull();
  expect(body.strength).toBeNull();
  expect(body.counters).toBeNull();
  expect(body.damage.team.physical + body.damage.team.magic + body.damage.team.mixed).toBe(5);
});
