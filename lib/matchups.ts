// Turns real match stats into a short list for the hero pick prompt: which
// heroes for my lane do best against the enemy picks and beside my team.
// Gemini still chooses and explains; this just stops it guessing at counters.

import { HERO_LANES } from './heroes';
import { LANES, type Lane } from './draft';
import { loadGains } from './arena';

// Each hero's win rate change against or alongside one picked hero.
export type Gains = Map<string, number>;

// `best` is the enemy this hero gains the most against, so the reason Gemini
// gives can name a counter the numbers back, rather than one it recalls.
export type Ranked = {
  hero: string;
  against: number;
  alongside: number;
  best: { enemy: string; gain: number } | null;
};

// With a pool, the pool is the whole field; without one, every hero whose
// usual lane is mine. Either way a hero already picked cannot be picked again.
export function candidatesFor(
  lane: Lane,
  pool: string[],
  taken: string[],
  lanes: Partial<Record<string, Lane>> = HERO_LANES,
) {
  const field = pool.length ? pool : Object.keys(lanes).filter((h) => lanes[h] === lane);
  const gone = new Set(taken);
  return field.filter((h) => !gone.has(h));
}

// Gains add up across the picks, so a hero good into two enemies beats one
// great into a single enemy and bad into the other. Rounded so float noise
// does not show in the prompt or decide a tie.
const sum = (tables: Gains[], hero: string) =>
  Math.round(tables.reduce((total, t) => total + (t.get(hero) ?? 0), 0) * 10_000) / 10_000;

// A hero no table mentions has no numbers behind it; showing it as +0.0%
// would read as a measured, neutral matchup.
export function rankPicks(
  candidates: string[],
  against: Map<string, Gains>,
  alongside: Gains[],
): Ranked[] {
  const enemies = [...against.values()];
  const tables = [...enemies, ...alongside];
  return candidates
    .filter((hero) => tables.some((t) => t.has(hero)))
    .map((hero) => ({
      hero,
      against: sum(enemies, hero),
      alongside: sum(alongside, hero),
      best: bestInto(against, hero),
    }))
    .sort((a, b) => b.against + b.alongside - (a.against + a.alongside));
}

// Only a real gain counts as a counter; doing least badly into someone is not.
function bestInto(against: Map<string, Gains>, hero: string): Ranked['best'] {
  let best: Ranked['best'] = null;
  for (const [enemy, table] of against) {
    const gain = table.get(hero) ?? 0;
    if (gain > 0 && (!best || gain > best.gain)) best = { enemy, gain };
  }
  return best;
}

const percent = (n: number) => `${n < 0 ? '-' : '+'}${Math.abs(n * 100).toFixed(1)}%`;

export function matchupLines(ranked: Ranked[], withTeam: boolean) {
  return ranked.map(
    (r) =>
      `${r.hero.toLowerCase()}: ${percent(r.against)} vs enemy` +
      (r.best ? ` (best into ${r.best.enemy.toLowerCase()} ${percent(r.best.gain)})` : '') +
      (withTeam ? `, ${percent(r.alongside)} with my team` : ''),
  );
}

// What the browser sends with a hero pick ask: the board as names.
export type Picks = { lane: Lane; enemy: string[]; team: string[]; pool: string[] };

const names = (v: unknown) =>
  Array.isArray(v) && v.every((n) => typeof n === 'string') ? (v as string[]).slice(0, 10) : null;

// The body comes from the browser, so take only a well-formed board.
export function picksFrom(v: unknown): Picks | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const lane = LANES.find((l) => l.key === o.lane)?.key;
  const [enemy, team, pool] = [names(o.enemy), names(o.team), names(o.pool)];
  return lane && enemy && team && pool ? { lane, enemy, team, pool } : null;
}

// The few heroes worth naming; more than this and the prompt drowns the picks.
const SHOWN = 8;

// One hero's stats failing to load costs that hero's numbers, not the rest.
const loaded = async (heroes: string[], kind: 'counters' | 'teammates') =>
  (await Promise.allSettled(heroes.map((h) => loadGains(h, kind)))).flatMap((r, i) =>
    r.status === 'fulfilled' ? [[heroes[i], r.value] as const] : [],
  );

export async function matchupData(picks: Picks): Promise<string[]> {
  if (!picks.enemy.length && !picks.team.length) return [];
  const [against, alongside] = await Promise.all([
    loaded(picks.enemy, 'counters'),
    loaded(picks.team, 'teammates'),
  ]);
  const candidates = candidatesFor(picks.lane, picks.pool, [...picks.enemy, ...picks.team]);
  const ranked = rankPicks(
    candidates,
    new Map(against),
    alongside.map(([, gains]) => gains),
  ).slice(0, SHOWN);
  return matchupLines(ranked, alongside.length > 0);
}
