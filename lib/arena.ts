// Rone Arena is a community API over Moonton's own MLBB Academy data, so its
// item names and icons are the ones the shop uses this patch. We read it on
// the server for two things: icons beside a build, and the list of items that
// still exist, so Gemini stops recommending ones that were removed.

export const ARENA_API = 'https://arena.rone.dev/api';

type Equip = { data: { equipname: string; equipicon: string } };
type Spell = { data: { __data: { skillname: string; skillicon: string } } };
type Page<T> = { data?: { records?: T[] } };

export type Catalog = {
  // Every item and battle spell still in the game, by its in-game name.
  icons: Map<string, string | null>;
  // The shop's item names, for the build prompt.
  items: string[];
};

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// The Academy keeps removed items around with a marker on the name.
const removed = (name: string) => /\(discarded\)/i.test(name);

export function catalogFrom(equipment: Page<Equip>, spells: Page<Spell>): Catalog {
  const icons = new Map<string, string | null>();
  const items: string[] = [];
  for (const { data } of equipment.data?.records ?? []) {
    const name = data.equipname?.trim();
    if (!name || removed(name)) continue;
    icons.set(name, data.equipicon || null);
    items.push(name);
  }
  for (const { data } of spells.data?.records ?? []) {
    const name = data.__data?.skillname?.trim();
    if (name) icons.set(name, data.__data.skillicon || null);
  }
  return { icons, items };
}

// Gemini writes names its own way: different case, a curly apostrophe, a
// core or situational tag after a dash. Match loosely, and failing that try
// the part before the dash, since a boots blessing is written after one.
export function iconFor(catalog: Catalog, name: string): string | null {
  const byKey = new Map([...catalog.icons].map(([n, src]) => [squash(n), src]));
  for (const candidate of [name, name.split(/\s*[-–—]\s/)[0]]) {
    const src = byKey.get(squash(candidate));
    if (src !== undefined) return src;
  }
  return null;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${ARENA_API}${path}`, {
    headers: { 'user-agent': 'DraftSensei (MLBB draft helper)' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`arena answered ${response.status}`);
  return response.json();
}

// The shop changes once a patch and the match stats once a day, so one fetch
// serves every draft for hours. A failed fetch is not kept, so the next ask
// tries again.
const KEEP_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

function remember<T>(key: string, load: () => Promise<T>, now: number): Promise<T> {
  const hit = cache.get(key);
  if (hit && now - hit.at < KEEP_MS) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { at: now, value });
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  return value;
}

export const forgetArena = () => cache.clear();

export const loadCatalog = (now = Date.now()) =>
  remember(
    'catalog',
    () =>
      Promise.all([
        get<Page<Equip>>('/academy/equipment?size=500'),
        get<Page<Spell>>('/academy/spells?size=50'),
      ]).then(([equipment, spells]) => catalogFrom(equipment, spells)),
    now,
  );

type HeroRecord = { data: { hero_id: number; hero: { data: { name: string; head?: string } } } };
type Relation = { data: { sub_hero: { heroid: number; increase_win_rate: number }[] } };

const loadHeroes = (now: number) =>
  remember('heroes', () => get<Page<HeroRecord>>('/heroes?size=500'), now).then(
    (page) => page.data?.records ?? [],
  );

const loadHeroIds = (now: number) =>
  loadHeroes(now).then((heroes) => new Map(heroes.map((r) => [r.data.hero_id, r.data.hero.data.name])));

// The proxy in front of the Academy's art resizes on request. Full portraits
// are around 50KB; at chip size they are a twentieth of that.
export const portraitUrl = (head: string | undefined) =>
  head ? `${head}&w=64&h=64&fit=cover&output=webp` : null;

export const loadPortraits = (now = Date.now()) =>
  loadHeroes(now).then((heroes) =>
    Object.fromEntries(heroes.map((r) => [r.data.hero.data.name, portraitUrl(r.data.hero.data.head)])),
  );

// How much every other hero's win rate moves when they face this hero
// (counters) or play beside them (teammates), from real ranked games.
export async function loadGains(
  hero: string,
  kind: 'counters' | 'teammates',
  now = Date.now(),
): Promise<Map<string, number>> {
  const names = await loadHeroIds(now);
  const id = [...names].find(([, name]) => squash(name) === squash(hero))?.[0];
  if (id === undefined) throw new Error(`arena does not know ${hero}`);
  return remember(
    `${kind}:${id}`,
    () =>
      get<Page<Relation>>(`/academy/heroes/${id}/${kind}`).then(
        (page) =>
          new Map(
            (page.data?.records?.[0]?.data.sub_hero ?? []).flatMap((s) => {
              const name = names.get(s.heroid);
              return name ? [[name, s.increase_win_rate] as const] : [];
            }),
          ),
      ),
    now,
  );
}
