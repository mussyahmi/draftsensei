import { test, expect, vi, afterEach } from 'vitest';
import { catalogFrom, iconFor, loadCatalog, loadGains, forgetArena } from '../lib/arena';

const equipment = {
  data: {
    records: [
      { data: { equipname: 'Dominance Ice', equipicon: 'https://img/dominance.png' } },
      { data: { equipname: "Athena's Shield", equipicon: 'https://img/athena.png' } },
      { data: { equipname: 'Tough Boots - Encourage', equipicon: 'https://img/encourage.png' } },
      { data: { equipname: 'Tough Boots', equipicon: 'https://img/tough.png' } },
      { data: { equipname: 'Twilight Armor (Discarded)', equipicon: 'https://img/twilight.png' } },
      { data: { equipname: 'Blank Icon', equipicon: '' } },
    ],
  },
};
const roles = {
  data: { records: [{ data: { emblem_title: 'Support', emblem_icon: 'https://img/support.png' } }] },
};
const spells = {
  data: { records: [{ data: { __data: { skillname: 'Flicker', skillicon: 'https://img/flicker.png' } } }] },
};

const catalog = catalogFrom(equipment, spells, roles);

test('the item list leaves out items the game has removed', () => {
  expect(catalog.items).toEqual([
    'Dominance Ice',
    "Athena's Shield",
    'Tough Boots - Encourage',
    'Tough Boots',
    'Blank Icon',
  ]);
});

test('emblems get their icons too', () => {
  expect(iconFor(catalog, 'support')).toBe('https://img/support.png');
});

test('icons match however Gemini cases or punctuates the name', () => {
  expect(iconFor(catalog, 'dominance ice')).toBe('https://img/dominance.png');
  expect(iconFor(catalog, 'Athena’s Shield')).toBe('https://img/athena.png');
  expect(iconFor(catalog, 'Flicker')).toBe('https://img/flicker.png');
});

test('a blessed boots name gets its own icon, a tagged one falls back to the item', () => {
  expect(iconFor(catalog, 'Tough Boots - Encourage')).toBe('https://img/encourage.png');
  expect(iconFor(catalog, 'Dominance Ice - core')).toBe('https://img/dominance.png');
});

test('a removed, unknown or iconless item gets no icon', () => {
  expect(iconFor(catalog, 'Twilight Armor')).toBeNull();
  expect(iconFor(catalog, 'Made Up')).toBeNull();
  expect(iconFor(catalog, 'Blank Icon')).toBeNull();
});

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

const serve = () =>
  vi.fn(async (url: string) =>
    new Response(
      JSON.stringify(url.includes('/spells') ? spells : url.includes('/roles') ? roles : equipment),
      { status: 200 },
    ));

test('the catalog is fetched once and reused across asks', async () => {
  const fetch = serve();
  vi.stubGlobal('fetch', fetch);
  await loadCatalog(0);
  await loadCatalog(60_000);
  expect(fetch).toHaveBeenCalledTimes(3); // equipment, spells and emblems, once each
});

test('a failed fetch is not kept, so the next ask tries again', async () => {
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  await expect(loadCatalog(0)).rejects.toThrow();
  vi.stubGlobal('fetch', serve());
  await expect(loadCatalog(1)).resolves.toMatchObject({ items: expect.any(Array) });
});

test('match stats are asked for at my rank', async () => {
  const seen: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    seen.push(url);
    const body = url.includes('/heroes?size')
      ? { data: { records: [{ data: { hero_id: 27, hero: { data: { name: 'Sun' } } } }] } }
      : { data: { records: [{ data: { sub_hero: [] } }] } };
    return new Response(JSON.stringify(body));
  });
  await loadGains('Sun', 'counters', 'glory', 0);
  expect(seen).toContain('https://arena.rone.dev/api/academy/heroes/27/counters?rank=glory');
});

test('a rate limit reported in the body is not kept as an empty catalog', async () => {
  let calls = 0;
  vi.stubGlobal('fetch', async () => {
    calls++;
    return new Response(JSON.stringify({ status: 'error', code: 'UPSTREAM_RATE_LIMITED' }));
  });
  await expect(loadCatalog(0)).rejects.toThrow('UPSTREAM_RATE_LIMITED');
  await expect(loadCatalog(1)).rejects.toThrow();
  expect(calls).toBeGreaterThan(3);
});

test('a counters table is flipped into the listed hero\'s gain; a teammates table is not', async () => {
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.includes('/heroes?size')) {
      const hero = (hero_id: number, name: string) => ({ data: { hero_id, hero: { data: { name } } } });
      return new Response(JSON.stringify({ data: { records: [hero(88, 'Masha'), hero(7, 'Estes'), hero(9, 'Gloo'), hero(5, 'Nana')] } }));
    }
    const rows = [{ heroid: 7, increase_win_rate: -0.032 }, { heroid: 9, increase_win_rate: 0.038 }, { heroid: 5, increase_win_rate: 0 }];
    return new Response(JSON.stringify({ data: { records: [{ data: { sub_hero: rows } }] } }));
  });
  const against = await loadGains('Masha', 'counters', 'all', 0);
  expect(against.get('Estes')).toBeCloseTo(0.032);
  expect(against.get('Gloo')).toBeCloseTo(-0.038);
  expect(Object.is(against.get('Nana'), 0)).toBe(true);
  const beside = await loadGains('Masha', 'teammates', 'all', 0);
  expect(beside.get('Estes')).toBeCloseTo(-0.032);
});
