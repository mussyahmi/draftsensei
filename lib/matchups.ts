// Turns real match stats into a short list for the hero pick prompt: which
// heroes for my lane do best against the enemy picks and beside my team.
// Gemini still chooses and explains; this just stops it guessing at counters.

import { HERO_LANES, HERO_OTHER_LANES } from './heroes';
import { LANES, RANKS, type Lane, type Rank } from './draft';
import { loadGains, loadMeta } from './arena';
import { fillsGaps, GAP_BOOST, teamGaps, type Gap } from './team-balance';

// Each hero's win rate change against or alongside one picked hero.
export type Gains = Map<string, number>;

// `best` is the enemy this hero gains the most against, so the reason Gemini
// gives can name a counter the numbers back, rather than one it recalls.
export type Ranked = {
  hero: string;
  against: number;
  alongside: number;
  best: { enemy: string; gain: number } | null;
  // The teammate it plays best beside, for the same reason.
  partner?: { ally: string; gain: number } | null;
  // How it does into the enemy in my lane, the matchup that decides the lane.
  opponent?: { enemy: string; gain: number } | null;
  // Its win rate this week at my rank, before any matchup.
  win?: number;
  // What my team is missing that this hero brings.
  fills?: Gap[];
};

// With a pool, the pool is the whole field; without one, every hero who
// plays my lane, as their usual lane or another the game lists. Either way a hero already picked cannot be picked again.
export function candidatesFor(
  lane: Lane,
  pool: string[],
  taken: string[],
  lanes: Partial<Record<string, Lane>> = HERO_LANES,
  bans: string[] = [],
  others: Partial<Record<string, Lane[]>> = HERO_OTHER_LANES,
) {
  const field = pool.length
    ? pool
    : Object.keys(lanes).filter((h) => lanes[h] === lane || others[h]?.includes(lane));
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
// Gains are on top of how a hero usually does, so a hero losing most games
// needs bigger counters to beat one already winning: the ranking starts from
// its win rate at my rank. A hero with no win rate starts even. A hero that
// brings what my team is missing moves up, without outranking a far better
// matchup.
export function rankPicks(
  candidates: string[],
  against: Map<string, Gains>,
  alongside: Map<string, Gains>,
  opponent?: string,
  wins: Map<string, number> = new Map(),
  gaps: Gap[] = [],
): Ranked[] {
  const enemies = [...against.values()];
  const allies = [...alongside.values()];
  const tables = [...enemies, ...allies];
  const lane = opponent ? against.get(opponent) : undefined;
  const score = (r: Ranked) =>
    (r.win ?? 0.5) - 0.5 + r.against + r.alongside + (r.opponent?.gain ?? 0) + GAP_BOOST * (r.fills?.length ?? 0);
  return candidates
    .filter((hero) => tables.some((t) => t.has(hero)))
    .map((hero) => ({
      hero,
      against: sum(enemies, hero),
      alongside: sum(allies, hero),
      best: bestInto(against, hero),
      partner: bestWith(alongside, hero),
      opponent: lane && opponent ? { enemy: opponent, gain: lane.get(hero) ?? 0 } : null,
      ...(wins.has(hero) && { win: wins.get(hero) }),
      ...(fillsGaps(hero, gaps).length > 0 && { fills: fillsGaps(hero, gaps) }),
    }))
    .sort((a, b) => score(b) - score(a));
}

// Only a real gain counts as a counter or a partner; doing least badly
// beside or into someone is not.
function strongest(tables: Map<string, Gains>, hero: string) {
  let top: { name: string; gain: number } | null = null;
  for (const [name, table] of tables) {
    const gain = table.get(hero) ?? 0;
    if (gain > 0 && (!top || gain > top.gain)) top = { name, gain };
  }
  return top;
}

function bestInto(against: Map<string, Gains>, hero: string): Ranked['best'] {
  const top = strongest(against, hero);
  return top && { enemy: top.name, gain: top.gain };
}

function bestWith(alongside: Map<string, Gains>, hero: string): Ranked['partner'] {
  const top = strongest(alongside, hero);
  return top && { ally: top.name, gain: top.gain };
}

const percent = (n: number) => `${n < 0 ? '-' : '+'}${Math.abs(n * 100).toFixed(1)}%`;

export function matchupLines(ranked: Ranked[], withTeam: boolean) {
  return ranked.map(
    (r) =>
      `${r.hero.toLowerCase()}: ` +
      (r.win != null ? `${(r.win * 100).toFixed(1)}% win at my rank, ` : '') +
      `${percent(r.against)} vs enemy` +
      (r.best ? ` (best into ${r.best.enemy.toLowerCase()} ${percent(r.best.gain)})` : '') +
      (r.opponent ? `, vs lane opponent ${r.opponent.enemy.toLowerCase()} ${percent(r.opponent.gain)}` : '') +
      (withTeam ? `, ${percent(r.alongside)} with my team` : '') +
      (withTeam && r.partner ? ` (best with ${r.partner.ally.toLowerCase()} ${percent(r.partner.gain)})` : '') +
      (r.fills?.length ? `, adds the ${r.fills.join(' and ')} my team is missing` : ''),
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
  const rank = picks.rank ?? 'all';
  // Without win rates the matchups alone still rank the heroes.
  const [against, alongside, meta] = await Promise.all([
    loaded(picks.enemy, 'counters', rank),
    loaded(picks.team, 'teammates', rank),
    loadMeta(rank).catch(() => []),
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
    new Map(alongside),
    picks.opponent,
    new Map(meta.map((m) => [m.hero, m.win])),
    teamGaps(picks.team),
  ).slice(0, count);
  return { ranked, withTeam: alongside.length > 0 };
}

export async function matchupData(picks: Picks): Promise<string[]> {
  const { ranked, withTeam } = await rankedFor(picks);
  return matchupLines(ranked, withTeam);
}

// The line on an instant pick: its win rate when known, since the order starts
// from it, then its biggest win into an enemy (the lane opponent on a tie, since
// that is the fight it takes most), and the teammate it plays best beside, so a
// pick that is there for a combo says so.
export function pickReason(
  r: Ranked,
  words: { win: string; with: string } = { win: 'win', with: 'with' },
): string | null {
  const lane = r.opponent && r.opponent.gain > 0 ? r.opponent : null;
  const into = lane && (!r.best || lane.gain >= r.best.gain) ? lane : r.best;
  const parts = [
    into && [percent(into.gain), `vs ${into.enemy}`],
    r.partner && [percent(r.partner.gain), `${words.with} ${r.partner.ally}`],
  ].filter((p): p is string[] => Boolean(p));
  const gains = (first: string) => parts.map(([n, who], i) => (i === 0 ? `${n}${first} ${who}` : `${n} ${who}`));
  // "57.5% win, +1.2% vs Layla, +3.6% with Kaja": "win" once, on the first number.
  if (r.win != null) return [`${(r.win * 100).toFixed(1)}% ${words.win}`, ...gains('')].join(', ');
  return parts.length ? gains(` ${words.win}`).join(', ') : null;
}
