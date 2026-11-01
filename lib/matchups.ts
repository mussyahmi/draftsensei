// Turns real match stats into a short list for the hero pick prompt: which
// heroes for my lane do best against the enemy picks and beside my team.
// Gemini still chooses and explains; this just stops it guessing at counters.

import { HERO_LANES } from './heroes';
import { LANES, RANKS, type Lane, type Rank } from './draft';
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
  // How it does into the enemy in my lane, the matchup that decides the lane.
  opponent?: { enemy: string; gain: number } | null;
};

// With a pool, the pool is the whole field; without one, every hero whose
// usual lane is mine. Either way a hero already picked cannot be picked again.
export function candidatesFor(
  lane: Lane,
  pool: string[],
  taken: string[],
  lanes: Partial<Record<string, Lane>> = HERO_LANES,
  bans: string[] = [],
) {
  const field = pool.length ? pool : Object.keys(lanes).filter((h) => lanes[h] === lane);
  const gone = new Set([...taken, ...bans]);
  return field.filter((h) => !gone.has(h));
}

// Gains add up across the picks, so a hero good into two enemies beats one
// great into a single enemy and bad into the other. Rounded so float noise
// does not show in the prompt or decide a tie.
const sum = (tables: Gains[], hero: string) =>
  Math.round(tables.reduce((total, t) => total + (t.get(hero) ?? 0), 0) * 10_000) / 10_000;

// A hero no table mentions has no numbers behind it; showing it as +0.0%
// would read as a measured, neutral matchup.
// The enemy in my lane is who I fight most of the game, so that matchup
// counts double in the ranking. The total shown stays a plain sum.
export function rankPicks(
  candidates: string[],
  against: Map<string, Gains>,
  alongside: Gains[],
  opponent?: string,
): Ranked[] {
  const enemies = [...against.values()];
  const tables = [...enemies, ...alongside];
  const lane = opponent ? against.get(opponent) : undefined;
  const score = (r: Ranked) => r.against + r.alongside + (r.opponent?.gain ?? 0);
  return candidates
    .filter((hero) => tables.some((t) => t.has(hero)))
    .map((hero) => ({
      hero,
      against: sum(enemies, hero),
      alongside: sum(alongside, hero),
      best: bestInto(against, hero),
      opponent: lane && opponent ? { enemy: opponent, gain: lane.get(hero) ?? 0 } : null,
    }))
    .sort((a, b) => score(b) - score(a));
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
      (r.opponent ? `, vs lane opponent ${r.opponent.enemy.toLowerCase()} ${percent(r.opponent.gain)}` : '') +
      (withTeam ? `, ${percent(r.alongside)} with my team` : ''),
  );
}

// What the browser sends with a hero pick ask: the board as names.
export type Picks = {
  lane: Lane;
  enemy: string[];
  team: string[];
  pool: string[];
  bans?: string[];
  // The enemy picked into my lane, if any yet.
  opponent?: string;
  rank?: Rank;
};

const names = (v: unknown) =>
  Array.isArray(v) && v.every((n) => typeof n === 'string') ? (v as string[]).slice(0, 10) : null;

// The body comes from the browser, so take only a well-formed board.
export function picksFrom(v: unknown): Picks | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const lane = LANES.find((l) => l.key === o.lane)?.key;
  const [enemy, team, pool] = [names(o.enemy), names(o.team), names(o.pool)];
  if (!lane || !enemy || !team || !pool) return null;
  const bans = names(o.bans) ?? [];
  const opponent = typeof o.opponent === 'string' && enemy.includes(o.opponent) ? o.opponent : undefined;
  const rank = RANKS.find((r) => r.key === o.rank)?.key;
  return {
    lane,
    enemy,
    team,
    pool,
    ...(bans.length && { bans }),
    ...(opponent && { opponent }),
    ...(rank && { rank }),
  };
}

// The few heroes worth naming; more than this and the prompt drowns the picks.
const SHOWN = 8;

// One hero's stats failing to load costs that hero's numbers, not the rest.
const loaded = async (heroes: string[], kind: 'counters' | 'teammates', rank: Rank) =>
  (await Promise.allSettled(heroes.map((h) => loadGains(h, kind, rank)))).flatMap((r, i) =>
    r.status === 'fulfilled' ? [[heroes[i], r.value] as const] : [],
  );

// The heroes for my lane that do best on this board, strongest first, and
// whether any team stats loaded to back a "with my team" number.
export async function rankedFor(
  picks: Picks,
  count = SHOWN,
): Promise<{ ranked: Ranked[]; withTeam: boolean }> {
  if (!picks.enemy.length && !picks.team.length) return { ranked: [], withTeam: false };
  const [against, alongside] = await Promise.all([
    loaded(picks.enemy, 'counters', picks.rank ?? 'all'),
    loaded(picks.team, 'teammates', picks.rank ?? 'all'),
  ]);
  const candidates = candidatesFor(
    picks.lane,
    picks.pool,
    [...picks.enemy, ...picks.team],
    HERO_LANES,
    picks.bans,
  );
  const ranked = rankPicks(
    candidates,
    new Map(against),
    alongside.map(([, gains]) => gains),
    picks.opponent,
  ).slice(0, count);
  return { ranked, withTeam: alongside.length > 0 };
}

export async function matchupData(picks: Picks): Promise<string[]> {
  const { ranked, withTeam } = await rankedFor(picks);
  return matchupLines(ranked, withTeam);
}

// The one line on an instant pick, as how much more often it wins: its
// biggest win into an enemy, the lane opponent on a tie since that is the
// fight it takes most; failing any, how it fits my team.
export function pickReason(r: Ranked): string | null {
  const lane = r.opponent && r.opponent.gain > 0 ? r.opponent : null;
  const into = lane && (!r.best || lane.gain >= r.best.gain) ? lane : r.best;
  if (into) return `${percent(into.gain)} win vs ${into.enemy}`;
  if (r.alongside > 0) return `${percent(r.alongside)} win with team`;
  return null;
}
