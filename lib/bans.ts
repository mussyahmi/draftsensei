// The heroes worth banning right now: the ones winning the most at this rank
// this week, lifted by how often players there already ban them. A hero
// banned in most games barely shows a win rate, since it is rarely played,
// so its ban rate says the threat for it.

export type MetaHero = { hero: string; win: number; ban: number };

type RankRecord = {
  data: {
    main_hero: { data: { name: string } };
    main_hero_win_rate: number;
    main_hero_ban_rate: number;
  };
};
export type RankPage = { data?: { records?: RankRecord[] } };

// How much a ban counts against a win: banned in every game is worth ten
// points of win rate.
export const BAN_WEIGHT = 0.1;

const score = (m: MetaHero) => m.win - 0.5 + BAN_WEIGHT * m.ban;

/** Every hero in the page, strongest first. */
export function metaFrom(page: RankPage): MetaHero[] {
  return (page.data?.records ?? [])
    .map(({ data }) => ({
      hero: data.main_hero?.data?.name?.trim() ?? '',
      win: data.main_hero_win_rate,
      ban: data.main_hero_ban_rate,
    }))
    .filter((m) => m.hero && Number.isFinite(m.win) && Number.isFinite(m.ban))
    .sort((a, b) => score(b) - score(a));
}

export const BAN_SUGGESTIONS = 5;

/** The strongest heroes nobody has banned or picked yet. */
export function suggestBans(meta: MetaHero[], taken: string[], count = BAN_SUGGESTIONS) {
  const gone = new Set(taken.map((h) => h.toLowerCase()));
  return meta.filter((m) => !gone.has(m.hero.toLowerCase())).slice(0, count);
}

// "58% win, 24% banned": whole numbers read faster mid-draft.
export const banReason = (
  m: MetaHero,
  say: (win: number, ban: number) => string = (win, ban) => `${win}% win, ${ban}% banned`,
) => say(Math.round(m.win * 100), Math.round(m.ban * 100));

/** Win rate by hero name, for showing beside a hero wherever it is chosen. */
export const winsBy = (meta: MetaHero[]): Record<string, number> =>
  Object.fromEntries(meta.map((m) => [m.hero, m.win]));
