import { test, expect, vi, afterEach } from 'vitest';
import { catalogFrom, iconFor, loadCatalog, forgetArena } from '../lib/arena';

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
const spells = {
  data: { records: [{ data: { __data: { skillname: 'Flicker', skillicon: 'https://img/flicker.png' } } }] },
};

const catalog = catalogFrom(equipment, spells);

test('the item list leaves out items the game has removed', () => {
  expect(catalog.items).toEqual([
    'Dominance Ice',
    "Athena's Shield",
    'Tough Boots - Encourage',
    'Tough Boots',
    'Blank Icon',
  ]);
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
    new Response(JSON.stringify(url.includes('/spells') ? spells : equipment), { status: 200 }));

test('the catalog is fetched once and reused across asks', async () => {
  const fetch = serve();
  vi.stubGlobal('fetch', fetch);
  await loadCatalog(0);
  await loadCatalog(60_000);
  expect(fetch).toHaveBeenCalledTimes(2); // equipment and spells, once each
});

test('a failed fetch is not kept, so the next ask tries again', async () => {
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  await expect(loadCatalog(0)).rejects.toThrow();
  vi.stubGlobal('fetch', serve());
  await expect(loadCatalog(1)).resolves.toMatchObject({ items: expect.any(Array) });
});
