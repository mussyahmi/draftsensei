import { test, expect, vi, afterEach } from 'vitest';
import { heroDetail } from '../lib/hero-detail';
import { GET } from '../app/api/hero/route';
import { forgetArena } from '../lib/arena';
import { metaFrom } from '../lib/bans';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

test('a gain against this hero means it loses to that hero, a loss means it beats them', () => {
  const against = new Map([['Estes', 0.03], ['Gloo', -0.04], ['Nana', 0]]);
  const detail = heroDetail('Masha', against, new Map());
  expect(detail.beatenBy).toEqual([{ hero: 'Estes', gain: 0.03 }]);
  expect(detail.beats).toEqual([{ hero: 'Gloo', gain: 0.04 }]);
});

test('partners are real gains, strongest first, and five at most', () => {
  const alongside = new Map([['A', 0.01], ['B', 0.06], ['C', 0.05], ['D', 0.04], ['E', 0.03], ['F', 0.02], ['G', -0.01]]);
  expect(heroDetail('Masha', new Map(), alongside).partners.map((p) => p.hero)).toEqual(['B', 'C', 'D', 'E', 'F']);
});

test('a hero is never listed against or beside itself', () => {
  const detail = heroDetail('Masha', new Map([['Masha', 0.5]]), new Map([['Masha', 0.5]]));
  expect(detail).toEqual({ beatenBy: [], beats: [], partners: [] });
});

test('the page gets pick rate when the data has it', () => {
  const record = (name: string, pick?: number) => ({
    data: { main_hero: { data: { name } }, main_hero_win_rate: 0.5, main_hero_ban_rate: 0.1, main_hero_appearance_rate: pick },
  });
  const meta = metaFrom({ data: { records: [record('Nana', 0.02), record('Layla')] } });
  expect(meta.find((m) => m.hero === 'Nana')!.pick).toBe(0.02);
  expect(meta.find((m) => m.hero === 'Layla')!.pick).toBeUndefined();
});

test('the route refuses a made-up hero, and says null when the data source is down', async () => {
  expect((await GET(new Request('http://x/api/hero?hero=Made+Up'))).status).toBe(400);
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  const res = await GET(new Request('http://x/api/hero?hero=Nana&rank=all'));
  expect(res.status).toBe(200);
  expect(await res.json()).toBeNull();
});
