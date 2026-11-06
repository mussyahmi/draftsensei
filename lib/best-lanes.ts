// Which lane has the strongest heroes this week. Every game has one hero per
// lane on each side, so a lane as a whole always wins about half its games;
// what differs is how strong its best few heroes are.

import { HERO_LANES } from './heroes';
import { LANES, type Lane, type Pool } from './draft';
import type { MetaHero } from './bans';

// A hero banned this often is too often gone to count on.
export const OFTEN_BANNED = 1 / 3;

const TOP = 3;

// Closer than this, the order of two lanes is noise.
export const CLOSE = 0.005;

export type LaneStrength = { lane: Lane; win: number; heroes: MetaHero[] };

// Every hero under its usual lane, as the game lists it.
export const usualLanes = (lanes: Partial<Record<string, Lane>> = HERO_LANES): Pool =>
  Object.fromEntries(
    LANES.map((l) => [l.key, Object.keys(lanes).filter((h) => lanes[h] === l.key)]),
  ) as Pool;

// Each lane by the average win rate of its best few heroes still open to pick,
// strongest first. A lane with none of them is left out.
export function bestLanes(meta: MetaHero[], field: Pool): LaneStrength[] {
  const byHero = new Map(meta.map((m) => [m.hero, m]));
  return LANES.flatMap(({ key }) => {
    const heroes = field[key]
      .map((h) => byHero.get(h))
      .filter((m): m is MetaHero => Boolean(m) && m!.ban <= OFTEN_BANNED)
      .sort((a, b) => b.win - a.win)
      .slice(0, TOP);
    if (!heroes.length) return [];
    return [{ lane: key, win: heroes.reduce((s, m) => s + m.win, 0) / heroes.length, heroes }];
  }).sort((a, b) => b.win - a.win);
}
