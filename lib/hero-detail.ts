// One hero's matchups and teammates, for reading between games.

import type { Gains } from './matchups';

export type HeroEdge = { hero: string; gain: number };
export type HeroDetail = { beatenBy: HeroEdge[]; beats: HeroEdge[]; partners: HeroEdge[] };

const SHOWN = 5;

const top = (gains: HeroEdge[]) => gains.sort((a, b) => b.gain - a.gain).slice(0, SHOWN);

/**
 * `against` holds how much each hero gains against this one, so a gain means
 * it beats this hero, and a loss means this hero beats it.
 */
export function heroDetail(hero: string, against: Gains, alongside: Gains): HeroDetail {
  const others = (table: Gains) => [...table].filter(([name]) => name !== hero);
  return {
    beatenBy: top(others(against).flatMap(([name, gain]) => (gain > 0 ? [{ hero: name, gain }] : []))),
    beats: top(others(against).flatMap(([name, gain]) => (gain < 0 ? [{ hero: name, gain: 0 - gain }] : []))),
    partners: top(others(alongside).flatMap(([name, gain]) => (gain > 0 ? [{ hero: name, gain }] : []))),
  };
}
