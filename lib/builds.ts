// The Academy's most played builds for a hero in a lane, from ranked games.
// They ground the build answer the way counters ground hero picks: Gemini
// keeps what wins and adapts the rest to the enemy.

export type Build = {
  winRate: number;
  pickRate: number;
  spell: string;
  emblem: string;
  talents: string[];
  // The core items only; the Academy lists three per build.
  items: string[];
};

type Raw = {
  build_win_rate: number;
  build_pick_rate: number;
  battleskill?: { data?: { __data?: { skillname?: string } } };
  emblem?: { data?: { emblemname?: string } };
  equipid?: number[];
  new_rune_skill?: number[];
};
export type BuildPage = { data?: { records?: { data: { build?: Raw[] } }[] } };

// Ids the shop or talent list no longer knows are dropped rather than shown
// to Gemini as bare numbers.
const named = (ids: number[] | undefined, names: Map<number, string>) =>
  (ids ?? []).flatMap((id) => (names.has(id) ? [names.get(id)!] : []));

// The Academy files the Common emblem, the one every role can use, under
// "All"; the game calls it Common.
export const emblemName = (name: string) => (name.trim() === 'All' ? 'Common' : name);

export function buildsFrom(
  page: BuildPage,
  items: Map<number, string>,
  talents: Map<number, string>,
): Build[] {
  return (page.data?.records?.[0]?.data.build ?? [])
    .map((b) => ({
      winRate: b.build_win_rate,
      pickRate: b.build_pick_rate,
      spell: b.battleskill?.data?.__data?.skillname ?? '',
      emblem: emblemName(b.emblem?.data?.emblemname ?? ''),
      talents: named(b.new_rune_skill, talents),
      items: named(b.equipid, items),
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

export function buildLines(builds: Build[]) {
  return builds.map((b) =>
    [
      `${percent(b.winRate)} win, ${percent(b.pickRate)} pick: ${b.spell}, ${b.emblem} emblem`,
      b.talents.length ? ` (${b.talents.join(', ')})` : '',
      `, core items ${b.items.join(', ')}`,
    ]
      .join('')
      .toLowerCase(),
  );
}

// Shoes go in every build exactly once, whatever they are called.
const isBoots = (name: string) => /boots|shoes/i.test(name);

/**
 * Six items in buying order: the Academy's core items, which have real win
 * rates behind them, topped up with the items players' own builds for this
 * hero agree on most. An item in only one of those builds is one player's
 * idea, not agreement, so it never makes the cut.
 */
export function fullBuild(core: string[], community: string[][], size = 6): string[] {
  const seen = new Map<string, { count: number; at: number }>();
  for (const build of community) {
    [...new Set(build)].forEach((item, i) => {
      const s = seen.get(item) ?? { count: 0, at: 0 };
      seen.set(item, { count: s.count + 1, at: s.at + i / Math.max(build.length - 1, 1) });
    });
  }
  const where = (item: string, fallback: number) => {
    const s = seen.get(item);
    return s ? s.at / s.count : fallback;
  };

  const chosen = [...new Set(core)];
  // Players split between kinds of boots, so no one pair may top the count,
  // yet every build needs some: take the kind most of them buy.
  if (!chosen.some(isBoots)) {
    const shoes = [...seen].filter(([item]) => isBoots(item)).sort(([, a], [, b]) => b.count - a.count)[0];
    if (shoes) chosen.unshift(shoes[0]);
  }
  let boots = chosen.some(isBoots);
  const extras = [...seen]
    .filter(([item, s]) => s.count >= 2 && !chosen.includes(item))
    .sort(([, a], [, b]) => b.count - a.count || a.at / a.count - b.at / b.count);
  for (const [item] of extras) {
    if (chosen.length >= size) break;
    if (isBoots(item)) {
      if (boots) continue;
      boots = true;
    }
    chosen.push(item);
  }
  // Core items players never list keep the Academy's own order, mid build.
  return chosen
    .map((item, i) => ({ item, at: where(item, 0.3 + i * 0.1) }))
    .sort((a, b) => a.at - b.at)
    .map((x) => x.item);
}
