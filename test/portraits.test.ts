import { test, expect, vi, afterEach } from 'vitest';
import { GET } from '../app/api/portraits/route';
import { forgetArena, portraitUrl } from '../lib/arena';
import { heroOf } from '../lib/icons';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

test('a portrait is asked for small, since it shows at chip size', () => {
  expect(portraitUrl('https://wsrv.nl/?url=https%3A%2F%2Fimg%2Fsun.png'))
    .toBe('https://wsrv.nl/?url=https%3A%2F%2Fimg%2Fsun.png&w=64&h=64&fit=cover&output=webp');
  expect(portraitUrl('')).toBeNull();
});

test('every hero comes back with a portrait, by name', async () => {
  vi.stubGlobal('fetch', async () =>
    new Response(JSON.stringify({
      data: { records: [
        { data: { hero_id: 27, hero: { data: { name: 'Sun', head: 'https://wsrv.nl/?url=sun' } } } },
        { data: { hero_id: 60, hero: { data: { name: 'Tigreal', head: '' } } } },
      ] },
    })));
  const res = await GET();
  expect(await res.json()).toEqual({
    Sun: 'https://wsrv.nl/?url=sun&w=64&h=64&fit=cover&output=webp',
    Tigreal: null,
  });
});

test('the data source being down means no portraits, not an error', async () => {
  vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }));
  const res = await GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({});
});

const heroes = ['Akai', 'Diggie', 'Jawhead', 'Yi Sun-shin', 'Sun'];

test('a suggestion line gives the hero it starts with', () => {
  expect(heroOf('**Diggie**', heroes)).toBe('Diggie');
  expect(heroOf('1. **Jawhead**', heroes)).toBe('Jawhead');
  expect(heroOf('Akai: Pins down Hanabi.', heroes)).toBe('Akai');
  expect(heroOf('- yi sun-shin — strong early', heroes)).toBe('Yi Sun-shin');
});

test('a longer name wins over a shorter one it starts with', () => {
  expect(heroOf('Yi Sun-shin', heroes)).toBe('Yi Sun-shin');
  expect(heroOf('Sun', heroes)).toBe('Sun');
});

test('a reason line, or a hero named mid-sentence, gives nothing', () => {
  expect(heroOf('Counters Sun clones with high burst.', heroes)).toBeNull();
  expect(heroOf('Sunny day', heroes)).toBeNull();
  expect(heroOf('', heroes)).toBeNull();
});
