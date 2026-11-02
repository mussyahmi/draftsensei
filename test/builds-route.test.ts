import { test, expect, vi, afterEach } from 'vitest';
import { GET } from '../app/api/builds/route';
import { forgetArena } from '../lib/arena';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

const page = (records: unknown[]) => ({ data: { records } });
const arena = (url: string) => {
  if (url.includes('/heroes?size')) return page([{ data: { hero_id: 20, hero: { data: { name: 'Nana' } } } }]);
  if (url.includes('/academy/equipment'))
    return page([
      { data: { equipid: 1, equipname: 'Arcane Boots', equipicon: 'https://img/boots.png' } },
      { data: { equipid: 2, equipname: 'Clock of Destiny', equipicon: 'https://img/clock.png' } },
    ]);
  if (url.includes('/academy/spells')) return page([{ data: { __data: { skillname: 'Flicker', skillicon: 'https://img/flicker.png' } } }]);
  if (url.includes('/academy/roles')) return page([{ data: { emblem_title: 'Mage', emblem_icon: 'https://img/mage.png' } }]);
  if (url.includes('/academy/emblems')) return page([{ data: { giftid: 7, emblemskill: { skillname: 'Inspire' } } }]);
  if (url.includes('/builds'))
    return page([{ data: { build: [
      { build_win_rate: 0.52, build_pick_rate: 0.3, battleskill: { data: { __data: { skillname: 'Flicker' } } }, emblem: { data: { emblemname: 'Mage' } }, equipid: [1], new_rune_skill: [7] },
      { build_win_rate: 0.57, build_pick_rate: 0.1, battleskill: { data: { __data: { skillname: 'Flicker' } } }, emblem: { data: { emblemname: 'Mage' } }, equipid: [1, 2], new_rune_skill: [7] },
    ] } }]);
  return null;
};

test('the winning build comes back with its icons', async () => {
  vi.stubGlobal('fetch', async (url: string) => new Response(JSON.stringify(arena(url))));
  const res = await GET(new Request('http://x/api/builds?hero=Nana&lane=mid&rank=mythic'));
  const top = await res.json();
  expect(top.build).toMatchObject({ winRate: 0.57, spell: 'Flicker', emblem: 'Mage', talents: ['Inspire'], items: ['Arcane Boots', 'Clock of Destiny'] });
  expect(top.icons).toEqual({
    Flicker: 'https://img/flicker.png',
    Mage: 'https://img/mage.png',
    'Arcane Boots': 'https://img/boots.png',
    'Clock of Destiny': 'https://img/clock.png',
  });
});

test('a build few people play is not shown, however well it wins', async () => {
  vi.stubGlobal('fetch', async (url: string) => {
    const body = arena(url);
    if (url.includes('/builds')) {
      const builds = (body as { data: { records: { data: { build: { build_pick_rate: number }[] } }[] } }).data.records[0].data.build;
      builds.forEach((b) => (b.build_pick_rate = 0.03));
    }
    return new Response(JSON.stringify(body));
  });
  const res = await GET(new Request('http://x/api/builds?hero=Nana&lane=mid'));
  expect(await res.json()).toBeNull();
});

test('a missing hero or lane is refused', async () => {
  expect((await GET(new Request('http://x/api/builds?hero=Nana'))).status).toBe(400);
});

test('the data source being down means no instant build, not an error', async () => {
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  const res = await GET(new Request('http://x/api/builds?hero=Nana&lane=mid'));
  expect(res.status).toBe(200);
  expect(await res.json()).toBeNull();
});
