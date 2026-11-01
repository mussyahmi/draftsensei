import { test, expect, vi, afterEach } from 'vitest';
import { GET } from '../app/api/icons/route';
import { forgetArena } from '../lib/arena';

const icons = (...names: string[]) =>
  GET(new Request(`http://localhost/api/icons?${names.map((n) => `n=${encodeURIComponent(n)}`).join('&')}`));

const equipment = {
  data: { records: [{ data: { equipname: 'Dominance Ice', equipicon: 'https://img/dominance.png' } }] },
};
const spells = {
  data: { records: [{ data: { __data: { skillname: 'Flicker', skillicon: 'https://img/flicker.png' } } }] },
};

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

test('each name gets its icon, or nothing when the shop does not know it', async () => {
  vi.stubGlobal('fetch', async (url: string) =>
    new Response(JSON.stringify(url.includes('/spells') ? spells : equipment), { status: 200 }));
  const res = await icons('Dominance Ice', 'Flicker', 'Made Up');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    'Dominance Ice': 'https://img/dominance.png',
    Flicker: 'https://img/flicker.png',
    'Made Up': null,
  });
});

test('the data source being down leaves the build without icons rather than failing', async () => {
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  const res = await icons('Dominance Ice');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ 'Dominance Ice': null });
});

test('asking for nothing is a bad request', async () => {
  expect((await icons()).status).toBe(400);
});
