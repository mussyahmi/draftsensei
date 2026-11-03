import { test, expect, vi, afterEach } from 'vitest';
import { banReason, metaFrom, suggestBans, threatGain, winsBy, withThreats } from '../lib/bans';
import { GET } from '../app/api/bans/route';
import { forgetArena } from '../lib/arena';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

const record = (name: string, win: number, ban: number) => ({
  data: {
    main_hero: { data: { name } },
    main_hero_win_rate: win,
    main_hero_ban_rate: ban,
  },
});

const page = {
  data: {
    records: [
      record('Hirara', 0.5, 0.71),
      record('Masha', 0.606, 0.226),
      record('Layla', 0.48, 0.01),
      record('Gloo', 0.564, 0.53),
      record('Argus', 0.572, 0.01),
    ],
  },
};

test('the strongest come first: winning most, lifted by being banned already', () => {
  expect(metaFrom(page).map((m) => m.hero)).toEqual(['Masha', 'Gloo', 'Argus', 'Hirara', 'Layla']);
});

test('a hero banned almost every game still counts as a threat', () => {
  const meta = metaFrom(page);
  const hirara = meta.findIndex((m) => m.hero === 'Hirara');
  const layla = meta.findIndex((m) => m.hero === 'Layla');
  expect(hirara).toBeLessThan(layla);
});

test('heroes already banned or picked are not suggested, and the next move up', () => {
  const picks = suggestBans(metaFrom(page), ['masha', 'Gloo'], 2);
  expect(picks.map((m) => m.hero)).toEqual(['Argus', 'Hirara']);
});

test('records missing a name or numbers are skipped', () => {
  const meta = metaFrom({
    data: { records: [record('', 0.5, 0.1), { data: { main_hero: { data: { name: 'Sun' } } } } as never] },
  });
  expect(meta).toEqual([]);
});

test('the reason is short whole numbers', () => {
  expect(banReason({ hero: 'Marcel', win: 0.579, ban: 0.236 })).toBe('58% win, 24% banned');
});

test('the route asks for this week at the given rank and answers strongest first', async () => {
  const urls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify(page));
  });
  const res = await GET(new Request('http://x/api/bans?rank=mythic'));
  expect(urls[0]).toContain('/heroes/rank?days=7&rank=mythic');
  expect((await res.json())[0]).toEqual({ hero: 'Masha', win: 0.606, ban: 0.226 });
});

test('an unknown rank falls back to all ranks', async () => {
  const urls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify(page));
  });
  await GET(new Request('http://x/api/bans?rank=nope'));
  expect(urls[0]).toContain('rank=all');
});

test('the data source being down means no suggestions, not an error', async () => {
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  const res = await GET(new Request('http://x/api/bans'));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual([]);
});

test('win rates are looked up by hero name', () => {
  const wins = winsBy([
    { hero: 'Nana', win: 0.53, ban: 0.1 },
    { hero: 'Layla', win: 0.48, ban: 0 },
  ]);
  expect(wins).toEqual({ Nana: 0.53, Layla: 0.48 });
});

const three = [
  { hero: 'Masha', win: 0.56, ban: 0 },
  { hero: 'Gloo', win: 0.55, ban: 0 },
  { hero: 'Argus', win: 0.53, ban: 0 },
];

test('a hero beating one of mine moves up and names who it beats', () => {
  const out = withThreats(three, [['Valir', new Map([['Argus', 0.04]])]]);
  expect(out.map((m) => m.hero)).toEqual(['Argus', 'Masha', 'Gloo']);
  expect(out[0].threat).toEqual({ hero: 'Valir', gain: 0.04 });
});

test('with several of mine, only the hardest counter counts', () => {
  const out = withThreats(three, [
    ['Valir', new Map([['Argus', 0.02]])],
    ['Nana', new Map([['Argus', 0.03]])],
  ]);
  expect(out.find((m) => m.hero === 'Argus')!.threat).toEqual({ hero: 'Nana', gain: 0.03 });
});

test('a tiny edge or a losing matchup names nobody and moves nothing', () => {
  const out = withThreats(three, [['Valir', new Map([['Argus', 0.015], ['Gloo', -0.03]])]]);
  expect(out.map((m) => m.hero)).toEqual(['Masha', 'Gloo', 'Argus']);
  expect(out.every((m) => !m.threat)).toBe(true);
});

test('a hero of mine is not a threat to itself', () => {
  const out = withThreats(three, [['Gloo', new Map([['Gloo', 0.09]])]]);
  expect(out.find((m) => m.hero === 'Gloo')!.threat).toBeUndefined();
});

test('with no heroes of mine, bans stay as they were', () => {
  expect(withThreats(three, [])).toEqual(three);
});

test('the route adds threats for the heroes I play, and ignores made-up names', async () => {
  const urls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    urls.push(url);
    if (url.includes('/heroes/rank')) return new Response(JSON.stringify(page));
    if (url.includes('/heroes?size')) {
      const hero = (hero_id: number, name: string) => ({ data: { hero_id, hero: { data: { name } } } });
      return new Response(JSON.stringify({ data: { records: [hero(5, 'Nana'), hero(9, 'Layla')] } }));
    }
    if (url.includes('/5/counters')) {
      return new Response(JSON.stringify({
        data: { records: [{ data: { sub_hero: [{ heroid: 9, increase_win_rate: -0.2 }] } }] },
      }));
    }
    return new Response('{}');
  });
  const res = await GET(new Request('http://x/api/bans?rank=all&mine=Nana&mine=Made+Up'));
  const body = await res.json();
  expect(body[0].hero).toBe('Layla');
  expect(body[0].threat).toEqual({ hero: 'Nana', gain: 0.2 });
  expect(urls.filter((u) => u.includes('/counters'))).toHaveLength(1);
});

test('a threat reads as a signed percentage', () => {
  expect(threatGain(0.03)).toBe('+3.0%');
});
