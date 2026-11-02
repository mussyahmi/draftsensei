import type { Lang } from './i18n';

export type Lane = 'exp' | 'mid' | 'jungle' | 'gold' | 'roam';

export type Side = 'team' | 'enemy';

export type Pick = { hero: string; lane: Lane };

export type Pool = Record<Lane, string[]>;

// The rank whose games the match stats come from. Set once and kept, like
// the lane: nobody has time to choose it during a draft.
export type Rank = 'all' | 'epic' | 'legend' | 'mythic' | 'honor' | 'glory';

export const RANKS: { key: Rank; label: string }[] = [
  { key: 'all', label: 'All ranks' },
  { key: 'epic', label: 'Epic' },
  { key: 'legend', label: 'Legend' },
  { key: 'mythic', label: 'Mythic' },
  { key: 'honor', label: 'Mythical Honor' },
  { key: 'glory', label: 'Mythical Glory and up' },
];

export type Draft = {
  myLane: Lane;
  picks: Record<Side, Pick[]>;
  myHero: string;
  // Heroes banned by either team; nobody can pick them.
  bans: string[];
  rank: Rank;
  // The page's language, set once like the rank and kept with the draft so
  // it follows the account to another device.
  lang: Lang;
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function searchHeroes(query: string, heroes: string[], taken: string[] = []) {
  const q = normalize(query);
  if (!q) return [];
  const takenSet = new Set(taken);
  const prefix: string[] = [];
  const inner: string[] = [];
  for (const hero of heroes) {
    if (takenSet.has(hero)) continue;
    const at = normalize(hero).indexOf(q);
    if (at === 0) prefix.push(hero);
    else if (at > 0) inner.push(hero);
  }
  return [...prefix, ...inner];
}

export const LANES: { key: Lane; label: string }[] = [
  { key: 'exp', label: 'exp lane' },
  { key: 'mid', label: 'mid lane' },
  { key: 'jungle', label: 'jungling' },
  { key: 'gold', label: 'gold lane' },
  { key: 'roam', label: 'roaming' },
];

export const laneLabel = (key: Lane) =>
  (LANES.find((l) => l.key === key) || { label: key as string }).label;

const withLanes = (picks: Pick[]) =>
  picks.length
    ? picks.map((p) => `${p.hero.toLowerCase()} (${laneLabel(p.lane)})`).join(' ')
    : 'none';

export const newPool = (): Pool =>
  LANES.reduce((pool, lane) => ({ ...pool, [lane.key]: [] }), {} as Pool);

export const poolFor = (pool: Pool | undefined, lane: Lane) => (pool && pool[lane]) || [];

export function pickPrompt(draft: Draft, pool?: Pool) {
  // A hero either side already took cannot be picked again, so it is no use
  // suggesting it, even when it sits in my pool.
  const picked = new Set([...draft.picks.enemy, ...draft.picks.team].map((p) => p.hero));
  const mine = poolFor(pool, draft.myLane).filter((h) => !picked.has(h));
  return [
    `suggest mobile legends ${laneLabel(draft.myLane)} hero`,
    '',
    `enemy pick: ${withLanes(draft.picks.enemy)}`,
    '',
    `my team pick: ${withLanes(draft.picks.team)}`,
    '',
    ...(draft.bans.length ? [`banned: ${draft.bans.map((h) => h.toLowerCase()).join(', ')}`, ''] : []),
    'answer with hero names, each with a reason of 6 words max',
    'do not suggest a hero already picked by either team',
    ...(draft.lang === 'ms' ? ['write the reasons in formal Malay (Bahasa Melayu), hero names in English'] : []),
    ...(mine.length
      ? ['', `only suggest from my heroes: ${mine.map((h) => h.toLowerCase()).join(', ')}`]
      : []),
  ].join('\n');
}

// Roamers and junglers enchant their boots with a blessing, and the right one
// matters as much as the items, so ask for it by name.
const BLESSINGS: Partial<Record<Lane, string>> = {
  roam: 'roam blessing',
  jungle: 'jungle blessing',
};

export function buildPrompt(draft: Draft) {
  const blessing = BLESSINGS[draft.myLane];
  return [
    `suggest mobile legends spell and item build for ${(draft.myHero || '...').toLowerCase()} (${laneLabel(draft.myLane)})`,
    '',
    `enemy pick: ${withLanes(draft.picks.enemy)}`,
    '',
    `my team pick: ${withLanes(draft.picks.team)}`,
    '',
    'answer short, no paragraphs:',
    '- first line: Battle spell: <name>',
    '- second line: Emblem: <name> (<its 3 talents>)',
    '- 6 items, numbered 1 to 6, names only, no other notes',
    '- order them by when to buy',
    ...(blessing ? [`- boots first, and name which ${blessing} to put on them`] : []),
    '',
    ...(draft.lang === 'ms'
      ? [
          'then 3 short lines, each starting with its label: Bantu dahulu:, Ult pada:, Syarat menang:',
          'write in formal Malay (Bahasa Melayu); keep hero, item, spell and emblem names in English, and the labels Battle spell: and Emblem: as written',
        ]
      : ['then 3 short lines, each starting with its label: Help first:, Ult on:, Win condition:']),
  ].join('\n');
}

export const newDraft = (): Draft => ({
  myLane: 'mid',
  picks: { enemy: [], team: [] },
  myHero: '',
  bans: [],
  rank: 'all',
  lang: 'en',
});

export function takenHeroes(draft: Draft) {
  return [
    ...draft.picks.enemy.map((p) => p.hero),
    ...draft.picks.team.map((p) => p.hero),
    ...(draft.myHero ? [draft.myHero] : []),
    ...draft.bans,
  ];
}

// Two heroes in the same lane means one of the auto-assigned lanes is wrong.
export function laneClashes(picks: Pick[]): Lane[] {
  const seen = picks.map((p) => p.lane);
  return LANES
    .map((l) => l.key)
    .filter((lane) => seen.filter((l) => l === lane).length > 1);
}
