// A read of the finished draft from the numbers alone: no score, since blending
// these into one would look like a win chance that nothing here measures.

import { damageSplit, type DamageSplit } from './team-balance';
import type { Gains } from './matchups';

export type DraftCheck = {
  // The hero on my team in my lane against the enemy there.
  lane: { me: string; enemy: string; gain: number } | null;
  strength: { team: number; enemy: number } | null;
  counters: {
    // Every one of my heroes against every enemy, added up.
    total: number;
    best: { hero: string; enemy: string; gain: number } | null;
    worst: { hero: string; enemy: string; gain: number } | null;
  } | null;
  combo: { a: string; b: string; gain: number } | null;
  damage: { team: DamageSplit; enemy: DamageSplit };
};

const average = (heroes: string[], wins: Map<string, number>) => {
  const known = heroes.flatMap((h) => wins.get(h) ?? []);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
};

export function draftCheck(input: {
  team: string[];
  enemy: string[];
  me: string | null;
  opponent: string | null;
  wins: Map<string, number>;
  // By enemy: how much each hero gains against that enemy.
  against: Map<string, Gains>;
  // By teammate: how much each hero gains beside that teammate.
  alongside: Map<string, Gains>;
}): DraftCheck {
  const { team, enemy, me, opponent, wins, against, alongside } = input;

  const laneGain = me && opponent ? against.get(opponent)?.get(me) : undefined;

  const [teamWin, enemyWin] = [average(team, wins), average(enemy, wins)];

  const pairs = enemy.flatMap((e) =>
    team.flatMap((hero) => {
      const gain = against.get(e)?.get(hero);
      return gain === undefined ? [] : [{ hero, enemy: e, gain }];
    }),
  );
  const ranked = [...pairs].sort((a, b) => b.gain - a.gain);

  const combos = team.flatMap((a) =>
    team.flatMap((b) => {
      const gain = a === b ? undefined : alongside.get(a)?.get(b);
      return gain === undefined ? [] : [{ a, b, gain }];
    }),
  );
  const combo = combos.sort((x, y) => y.gain - x.gain)[0];

  return {
    lane: me && opponent && laneGain !== undefined ? { me, enemy: opponent, gain: laneGain } : null,
    strength: teamWin !== null && enemyWin !== null ? { team: teamWin, enemy: enemyWin } : null,
    counters: pairs.length
      ? {
          total: pairs.reduce((sum, p) => sum + p.gain, 0),
          best: ranked[0].gain > 0 ? ranked[0] : null,
          worst: ranked.at(-1)!.gain < 0 ? ranked.at(-1)! : null,
        }
      : null,
    combo: combo && combo.gain > 0 ? combo : null,
    damage: { team: damageSplit(team), enemy: damageSplit(enemy) },
  };
}
