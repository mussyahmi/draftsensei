// A read of the finished draft from the numbers alone: no score, since blending
// these into one would look like a win chance that nothing here measures.

import { damageSplit, type DamageSplit } from './team-balance';
import type { Gains } from './matchups';
import { biggestThreats, type Threat } from './threat';

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
  // The enemies hardest on my team overall.
  threats: Threat[];
  // The enemy winning most at my rank, whatever it faces in this draft.
  strongest: { enemy: string; win: number } | null;
  // Who I do best and worst against, so I know who to chase and who to avoid.
  matchups: {
    best: { enemy: string; gain: number } | null;
    worst: { enemy: string; gain: number } | null;
  } | null;
  combo: { a: string; b: string; gain: number } | null;
  // My own best teammate, when the best pair is not already mine.
  partner: { me: string; ally: string; gain: number } | null;
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

  const strongest = enemy
    .flatMap((e) => {
      const win = wins.get(e);
      return win === undefined ? [] : [{ enemy: e, win }];
    })
    .sort((a, b) => b.win - a.win)[0];

  const [teamWin, enemyWin] = [average(team, wins), average(enemy, wins)];

  const pairs = enemy.flatMap((e) =>
    team.flatMap((hero) => {
      const gain = against.get(e)?.get(hero);
      return gain === undefined ? [] : [{ hero, enemy: e, gain }];
    }),
  );
  const ranked = [...pairs].sort((a, b) => b.gain - a.gain);

  // The enemy in my lane already has its own line.
  // Each pair is said once: the card reads top to bottom, so a line skips what
  // the lines before it already showed.
  const threats = biggestThreats(team, enemy, against);
  const pairKey = (hero: string, e: string) => `${hero}|${e}`;
  const said = new Set(threats.map((t) => pairKey(t.hero, t.enemy)));
  if (me && opponent) said.add(pairKey(me, opponent));
  const mine = ranked.filter((p) => p.hero === me && !said.has(pairKey(p.hero, p.enemy)));
  const myBest = mine[0];
  const myWorst = mine.at(-1);
  if (myBest && myBest.gain > 0) said.add(pairKey(myBest.hero, myBest.enemy));
  if (myWorst && myWorst.gain < 0) said.add(pairKey(myWorst.hero, myWorst.enemy));
  const fresh = ranked.filter((p) => !said.has(pairKey(p.hero, p.enemy)));

  const combos = team.flatMap((a) =>
    team.flatMap((b) => {
      const gain = a === b ? undefined : alongside.get(a)?.get(b);
      return gain === undefined ? [] : [{ a, b, gain }];
    }),
  );
  const sorted = combos.sort((x, y) => y.gain - x.gain).filter((c) => c.gain > 0);
  const combo = sorted[0];
  const myPair = me ? sorted.find((c) => c.a === me || c.b === me) : undefined;

  return {
    lane: me && opponent && laneGain !== undefined ? { me, enemy: opponent, gain: laneGain } : null,
    strength: teamWin !== null && enemyWin !== null ? { team: teamWin, enemy: enemyWin } : null,
    counters: pairs.length
      ? {
          total: pairs.reduce((sum, p) => sum + p.gain, 0),
          best: fresh[0]?.gain > 0 ? fresh[0] : null,
          worst: fresh.at(-1) && fresh.at(-1)!.gain < 0 ? fresh.at(-1)! : null,
        }
      : null,
    threats,
    strongest: strongest ?? null,
    matchups:
      myBest && (myBest.gain > 0 || myWorst!.gain < 0)
        ? {
            best: myBest.gain > 0 ? { enemy: myBest.enemy, gain: myBest.gain } : null,
            worst: myWorst!.gain < 0 ? { enemy: myWorst!.enemy, gain: myWorst!.gain } : null,
          }
        : null,
    combo: combo ?? null,
    partner: me && myPair && myPair !== combo && combo.a !== me && combo.b !== me
      ? { me, ally: myPair.a === me ? myPair.b : myPair.a, gain: myPair.gain }
      : null,
    damage: { team: damageSplit(team), enemy: damageSplit(enemy) },
  };
}
