import { test, expect, vi, afterEach } from 'vitest';
import { banReason, metaFrom, suggestBans, winsBy } from '../lib/bans';
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
