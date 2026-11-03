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

test('my best partner is named when the best pair is someone else', () => {
  const alongside = new Map([
    ['Chou', new Map([['Kagura', 0.02]])],
    ['Khufra', new Map([['Moskov', 0.01], ['Chou', -0.01]])],
  ]);
  const check = draftCheck({ ...base, alongside });
  expect(check.combo).toEqual({ a: 'Chou', b: 'Kagura', gain: 0.02 });
  expect(check.partner).toEqual({ me: 'Khufra', ally: 'Moskov', gain: 0.01 });
});

test('my partner reads the same whichever side of the table I am on', () => {
  const alongside = new Map([
    ['Chou', new Map([['Kagura', 0.02]])],
    ['Moskov', new Map([['Khufra', 0.01]])],
  ]);
  expect(draftCheck({ ...base, alongside }).partner).toEqual({ me: 'Khufra', ally: 'Moskov', gain: 0.01 });
});

test('in the best pair myself, or with no gain beside anyone, there is no second line', () => {
  const mineIsBest = new Map([['Khufra', new Map([['Chou', 0.03]])], ['Kagura', new Map([['Moskov', 0.01]])]]);
  expect(draftCheck({ ...base, alongside: mineIsBest }).partner).toBeNull();
  const noGain = new Map([['Chou', new Map([['Kagura', 0.02]])], ['Khufra', new Map([['Moskov', -0.01]])]]);
  expect(draftCheck({ ...base, alongside: noGain }).partner).toBeNull();
  expect(draftCheck({ ...base, me: null }).partner).toBeNull();
});

test('my matchups name who I do best and worst against', () => {
  const against = new Map([
    ['Rafaela', new Map([['Khufra', 0.02], ['Moskov', 0.05]])],
    ['Selena', new Map([['Khufra', -0.01], ['Moskov', -0.09]])],
    ['Bruno', new Map([['Khufra', 0.005]])],
  ]);
  expect(draftCheck({ ...base, opponent: null, against }).matchups).toEqual({
    best: { enemy: 'Rafaela', gain: 0.02 },
    worst: { enemy: 'Selena', gain: -0.01 },
  });
});

test('all winning or all losing, my matchups show only that side', () => {
  const winning = new Map([['Rafaela', new Map([['Khufra', 0.02]])], ['Selena', new Map([['Khufra', 0.01]])]]);
  expect(draftCheck({ ...base, opponent: null, against: winning }).matchups).toEqual({
    best: { enemy: 'Rafaela', gain: 0.02 },
    worst: null,
  });
  const losing = new Map([['Rafaela', new Map([['Khufra', -0.02]])], ['Selena', new Map([['Khufra', -0.01]])]]);
  expect(draftCheck({ ...base, opponent: null, against: losing }).matchups).toEqual({
    best: null,
    worst: { enemy: 'Rafaela', gain: -0.02 },
  });
});

test('with no hero of mine, or no numbers for it, there are no matchups', () => {
  expect(draftCheck({ ...base, me: null }).matchups).toBeNull();
  expect(draftCheck({ ...base, against: new Map() }).matchups).toBeNull();
  const flat = new Map([['Rafaela', new Map([['Khufra', 0]])]]);
  expect(draftCheck({ ...base, opponent: null, against: flat }).matchups).toBeNull();
});

test('the enemy in my lane has its own line, so my matchups leave it out', () => {
  const against = new Map([
    ['Rafaela', new Map([['Khufra', -0.02]])],
    ['Selena', new Map([['Khufra', 0.01]])],
    ['Bruno', new Map([['Khufra', -0.005]])],
  ]);
  const check = draftCheck({ ...base, against });
  expect(check.lane).toEqual({ me: 'Khufra', enemy: 'Rafaela', gain: -0.02 });
  expect(check.matchups).toEqual({
    best: { enemy: 'Selena', gain: 0.01 },
    worst: { enemy: 'Bruno', gain: -0.005 },
  });
  const onlyLane = new Map([['Rafaela', new Map([['Khufra', -0.02]])]]);
  expect(draftCheck({ ...base, against: onlyLane }).matchups).toBeNull();
});
