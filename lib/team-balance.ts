// What my team still needs, from the heroes on it so far. Two heroes say too
// little to warn about, and a full team can no longer change.

import type { Lane, Pick } from './draft';
import { HERO_LANES, playsLane } from './heroes';
import { HERO_PROFILES, type HeroProfile } from './hero-profiles';

export type Gap = 'tank' | 'magic' | 'physical';

const MIN_TO_JUDGE = 3;
const FULL_TEAM = 5;

// Two points of win rate: enough to split close matchups, not to beat a
// much better one.
export const GAP_BOOST = 0.02;

const deals = (p: HeroProfile, kind: 'magic' | 'physical') => p.damage === kind || p.damage === 'mixed';

export function teamGaps(team: string[], profiles: Record<string, HeroProfile> = HERO_PROFILES): Gap[] {
  if (team.length >= FULL_TEAM) return [];
  // A hero too new to have a profile cannot be judged, so it raises no alarm.
  const known = team.flatMap((h) => profiles[h] ?? []);
  if (known.length < MIN_TO_JUDGE) return [];
  return [
    ...(known.some((p) => p.roles.includes('Tank')) ? [] : (['tank'] as const)),
    ...(known.some((p) => deals(p, 'magic')) ? [] : (['magic'] as const)),
    ...(known.some((p) => deals(p, 'physical')) ? [] : (['physical'] as const)),
  ];
}

export function fillsGaps(hero: string, gaps: Gap[], profiles: Record<string, HeroProfile> = HERO_PROFILES): Gap[] {
  const p = profiles[hero];
  if (!p) return [];
  return gaps.filter((gap) => (gap === 'tank' ? p.roles.includes('Tank') : deals(p, gap)));
}

// What sets these heroes apart: a gap every one of them fills is no reason to
// choose between them, and the warning on my team already says it.
export function tellingFills(fills: (Gap[] | undefined)[]): Set<Gap> {
  const all = fills.flatMap((f) => f ?? []);
  return new Set(all.filter((gap) => !fills.every((f) => f?.includes(gap))));
}

export type DamageSplit = { physical: number; magic: number; mixed: number };
export type EnemyDamage = DamageSplit & { lean: 'physical' | 'magic' };

export function damageSplit(heroes: string[], profiles: Record<string, HeroProfile> = HERO_PROFILES): DamageSplit {
  const known = heroes.flatMap((h) => profiles[h] ?? []);
  const count = (d: HeroProfile['damage']) => known.filter((p) => p.damage === d).length;
  return { physical: count('physical'), magic: count('magic'), mixed: count('mixed') };
}

// Worth saying only when one kind clearly leads: at least three heroes, and
// two ahead of the other. A 3 and 2 split favours no defense over the other.
export function enemyDamage(enemy: string[], profiles: Record<string, HeroProfile> = HERO_PROFILES): EnemyDamage | null {
  const { physical, magic, mixed } = damageSplit(enemy, profiles);
  const lean = physical > magic ? 'physical' : 'magic';
  const [more, fewer] = lean === 'physical' ? [physical, magic] : [magic, physical];
  return more >= MIN_TO_JUDGE && more - fewer >= 2 ? { physical, magic, mixed, lean } : null;
}

/**
 * Heroes put in a lane the game does not list them for. A support in EXP farms
 * and fights like a support, so the team is short a real laner. A hero with no
 * known lane raises no alarm.
 */
export function offLane(picks: Pick[]): { hero: string; lane: Lane; usual: Lane }[] {
  return picks.flatMap(({ hero, lane }) => {
    const usual = HERO_LANES[hero];
    return usual && !playsLane(hero, lane) ? [{ hero, lane, usual }] : [];
  });
}
