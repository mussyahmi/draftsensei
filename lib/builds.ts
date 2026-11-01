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
      emblem: b.emblem?.data?.emblemname ?? '',
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
