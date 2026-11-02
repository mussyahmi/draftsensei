import { loadBuilds, loadCommunity } from './arena';
import { fullBuild, type Build } from './builds';
import type { Lane, Rank } from './draft';

// A build few people play can top the win rates by luck, like a mage on an
// assassin emblem. Only one played in a fair share of games counts.
export const MIN_PICK_RATE = 0.05;

/**
 * The build the page shows the moment a hero is chosen: the Academy's
 * winning build, its three core items topped up to six with what players'
 * own builds agree on. Null when no build is played widely enough to trust.
 */
export async function loadTopBuild(hero: string, lane: Lane, rank: Rank): Promise<Build | null> {
  const [builds, community] = await Promise.all([
    loadBuilds(hero, lane, rank).catch(() => []),
    loadCommunity(hero).catch(() => []),
  ]);
  const winning = builds.find((b) => b.pickRate >= MIN_PICK_RATE);
  return winning ? { ...winning, items: fullBuild(winning.items, community) } : null;
}
