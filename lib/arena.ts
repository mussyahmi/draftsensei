import { metaFrom, type MetaHero, type RankPage } from './bans';
import { buildsFrom, emblemName, type Build, type BuildPage } from './builds';
import type { Lane, Rank } from './draft';

// Rone Arena is a community API over Moonton's own MLBB Academy data, so its
// item names and icons are the ones the shop uses this patch. We read it on
// the server for two things: icons beside a build, and the list of items that
// still exist, so Gemini stops recommending ones that were removed.

export const ARENA_API = 'https://arena.rone.dev/api';

type Equip = { data: { equipid?: number; equipname: string; equipicon: string } };
type Spell = { data: { __data: { skillname: string; skillicon: string } } };
type Role = { data: { emblem_title?: string; emblem_icon?: string } };
type Page<T> = { data?: { records?: T[] } };

export type Catalog = {
  // Every item, battle spell and emblem still in the game, by its in-game name.
  icons: Map<string, string | null>;
  // The shop's item names, for the build prompt.
  items: string[];
  // Item names by the id the Academy's builds refer to them with.
  ids: Map<number, string>;
};

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// The Academy keeps removed items around with a marker on the name.
const removed = (name: string) => /\(discarded\)/i.test(name);

export function catalogFrom(
  equipment: Page<Equip>,
  spells: Page<Spell>,
  roles: Page<Role> = {},
): Catalog {
  const icons = new Map<string, string | null>();
  const items: string[] = [];
  const ids = new Map<number, string>();
  for (const { data } of equipment.data?.records ?? []) {
    const name = data.equipname?.trim();
    if (!name || removed(name)) continue;
    icons.set(name, data.equipicon || null);
    items.push(name);
    if (typeof data.equipid === 'number') ids.set(data.equipid, name);
  }
  // Emblems are listed with the roles, the Common one as "All".
  for (const { data } of roles.data?.records ?? []) {
    const name = data.emblem_title?.trim();
    if (name) icons.set(emblemName(name), data.emblem_icon || null);
  }
  for (const { data } of spells.data?.records ?? []) {
    const name = data.__data?.skillname?.trim();
    if (name) icons.set(name, data.__data.skillicon || null);
  }
  return { icons, items, ids };
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
  // When the Academy behind it rate-limits, Rone can say so in the body, and
  // an empty answer kept for hours would leave builds without icons.
  const body = await response.json();
  if (body?.status === 'error') throw new Error(`arena: ${body.code ?? 'error'}`);
  return body;
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
        get<Page<Role>>('/academy/roles'),
      ]).then(([equipment, spells, roles]) => catalogFrom(equipment, spells, roles)),
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
  rank: Rank = 'all',
  now = Date.now(),
): Promise<Map<string, number>> {
  const names = await loadHeroIds(now);
  const id = [...names].find(([, name]) => squash(name) === squash(hero))?.[0];
  if (id === undefined) throw new Error(`arena does not know ${hero}`);
  return remember(
    `${kind}:${id}:${rank}`,
    () =>
      get<Page<Relation>>(`/academy/heroes/${id}/${kind}?rank=${rank}`).then(
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

type Talent = { data: { giftid?: number; emblemskill?: { skillname?: string } } };

// Talent names by the id builds list them with.
const loadTalents = (now: number) =>
  remember(
    'talents',
    () =>
      get<Page<Talent>>('/academy/emblems?size=200').then(
        (page) =>
          new Map(
            (page.data?.records ?? []).flatMap(({ data }) =>
              typeof data.giftid === 'number' && data.emblemskill?.skillname
                ? [[data.giftid, data.emblemskill.skillname] as const]
                : [],
            ),
          ),
      ),
    now,
  );

// The most played builds for a hero in a lane, best win rate first.
export async function loadBuilds(
  hero: string,
  lane: Lane,
  rank: Rank = 'all',
  now = Date.now(),
): Promise<Build[]> {
  const [names, catalog, talents] = await Promise.all([
    loadHeroIds(now),
    loadCatalog(now),
    loadTalents(now),
  ]);
  const id = [...names].find(([, name]) => squash(name) === squash(hero))?.[0];
  if (id === undefined) throw new Error(`arena does not know ${hero}`);
  return remember(
    `builds:${id}:${lane}:${rank}`,
    () =>
      get<BuildPage>(`/academy/heroes/${id}/builds?lane=${lane}&rank=${rank}`).then((page) =>
        buildsFrom(page, catalog.ids, talents),
      ),
    now,
  );
}

type Community = { data: { data: { equips?: { equip_ids?: number[] }[] } } };

// The builds players share for a hero in the Academy, as item names. Each is
// one player's idea; what they agree on is what counts.
export async function loadCommunity(hero: string, now = Date.now()): Promise<string[][]> {
  const [names, catalog] = await Promise.all([loadHeroIds(now), loadCatalog(now)]);
  const id = [...names].find(([, name]) => squash(name) === squash(hero))?.[0];
  if (id === undefined) throw new Error(`arena does not know ${hero}`);
  return remember(
    `community:${id}`,
    () =>
      get<Page<Community>>(`/academy/heroes/${id}/recommended?size=20`).then((page) =>
        (page.data?.records ?? [])
          .map((r) =>
            (r.data?.data?.equips?.[0]?.equip_ids ?? []).flatMap((e) =>
              catalog.ids.has(e) ? [catalog.ids.get(e)!] : [],
            ),
          )
          .filter((items) => items.length >= 3),
      ),
    now,
  );
}

// Every hero's win and ban rate over the last week at this rank, strongest
// first, for ban suggestions.
export const loadMeta = (rank: Rank = 'all', now = Date.now()): Promise<MetaHero[]> =>
  remember(
    `meta:${rank}`,
    () =>
      get<RankPage>(`/heroes/rank?days=7&rank=${rank}&sort_field=win_rate&sort_order=desc&size=200`).then(
        metaFrom,
      ),
    now,
  );
