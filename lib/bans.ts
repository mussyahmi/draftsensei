// The heroes worth banning right now: the ones winning the most at this rank
// this week, lifted by how often players there already ban them. A hero
// banned in most games barely shows a win rate, since it is rarely played,
// so its ban rate says the threat for it.

export type MetaHero = {
  hero: string;
  win: number;
  ban: number;
  // How often it is picked, for the heroes page.
  pick?: number;
  // The hero of mine it beats the hardest, when it beats one.
  threat?: { hero: string; gain: number };
};

type RankRecord = {
  data: {
    main_hero: { data: { name: string } };
    main_hero_win_rate: number;
    main_hero_ban_rate: number;
    main_hero_appearance_rate?: number;
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
      ...(Number.isFinite(data.main_hero_appearance_rate) && { pick: data.main_hero_appearance_rate }),
    }))
    .filter((m) => m.hero && Number.isFinite(m.win) && Number.isFinite(m.ban))
    .sort((a, b) => score(b) - score(a));
}

// Below this a hero barely beats mine: about a quarter of all heroes clear
// one point against any given hero, so that would name nearly everyone.
export const MIN_THREAT = 0.02;

/** "+3.0%": one decimal, as on the pick suggestions. */
export const threatGain = (gain: number) => `+${(gain * 100).toFixed(1)}%`;

const threatScore = (m: MetaHero) => score(m) + (m.threat?.gain ?? 0);

/**
 * Every hero again, with those beating my heroes moved up by how hard: each
 * table holds how much better other heroes do against one of mine. The hardest
 * single counter counts, so a long list of mine does not lift everyone more.
 */
export function withThreats(
  meta: MetaHero[],
  counters: (readonly [string, Map<string, number>])[],
): MetaHero[] {
  return meta
    .map((m) => {
      const threat = counters
        .filter(([mine]) => mine !== m.hero)
        .map(([hero, table]) => ({ hero, gain: table.get(m.hero) ?? 0 }))
        .filter((t) => t.gain >= MIN_THREAT)
        .sort((a, b) => b.gain - a.gain)[0];
      return threat ? { ...m, threat } : m;
    })
    .sort((a, b) => threatScore(b) - threatScore(a));
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
