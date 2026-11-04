// The enemy whose matchups hurt my team most, added up across my heroes, and
// the one of mine it hurts the most, so there is a name to plan around.

import type { Gains } from './matchups';

export type Threat = { enemy: string; hero: string; gain: number };

// Below this across a whole team, no enemy stands out enough to name.
const MIN_THREAT = 0.01;

// Two: one name misses a second hero worth planning around, and past that the
// numbers are too small to mean much.
const SHOWN = 2;

export function biggestThreats(team: string[], enemy: string[], against: Map<string, Gains>): Threat[] {
  return enemy
    .flatMap((e) => {
      const pairs = team.flatMap((hero) => {
        const gain = against.get(e)?.get(hero);
        return gain === undefined ? [] : [{ hero, gain }];
      });
      if (!pairs.length) return [];
      const total = pairs.reduce((sum, p) => sum + p.gain, 0);
      const worst = pairs.reduce((a, b) => (b.gain < a.gain ? b : a));
      return [{ enemy: e, total, hero: worst.hero, gain: worst.gain }];
    })
    .filter((t) => t.total <= 0 - MIN_THREAT && t.gain < 0)
    .sort((a, b) => a.total - b.total)
    .slice(0, SHOWN)
    .map(({ enemy: e, hero, gain }) => ({ enemy: e, hero, gain }));
}
