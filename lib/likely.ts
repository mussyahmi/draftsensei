// A guess at what the enemy picks next: the lanes they have not filled and the
// heroes most picked there at my rank. It knows nothing of those players' own
// heroes, so it stays a nudge and always says "likely".

import { HERO_LANES } from './heroes';
import { LANES, type Lane, type Pick } from './draft';
import type { MetaHero } from './bans';

// Each one is a lookup at a data source that rate-limits.
export const LIKELY_SHOWN = 3;

export type Likely = { open: Lane[]; heroes: string[] };

// The most picked hero of each open lane comes first, so one crowded lane does
// not fill the list while another lane goes unnamed.
export function likelyEnemies(
  meta: MetaHero[],
  enemy: Pick[],
  gone: string[],
  lanes: Partial<Record<string, Lane>> = HERO_LANES,
): Likely {
  const open = LANES.map((l) => l.key).filter((key) => !enemy.some((p) => p.lane === key));
  const out = new Set([...gone, ...enemy.map((p) => p.hero)]);
  const seen = new Map<Lane, number>();
  const heroes = meta
    .filter((m) => m.pick != null && !out.has(m.hero) && open.includes(lanes[m.hero] as Lane))
    .sort((a, b) => b.pick! - a.pick!)
    .map((m) => {
      const lane = lanes[m.hero] as Lane;
      const turn = seen.get(lane) ?? 0;
      seen.set(lane, turn + 1);
      return { hero: m.hero, pick: m.pick!, turn };
    })
    .sort((a, b) => a.turn - b.turn || b.pick - a.pick)
    .slice(0, LIKELY_SHOWN)
    .map((m) => m.hero);
  return { open, heroes };
}
