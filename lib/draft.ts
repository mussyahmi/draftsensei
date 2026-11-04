import type { Lang } from './i18n';
import { enemyDamage } from './team-balance';

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

// Names players use that no rule below could work out.
const NICKNAMES: Record<string, string> = {
  pk: 'Popol and Kupa',
  gwen: 'Guinevere',
};

const wordsOf = (hero: string) => hero.split(/[\s.-]+/).filter((w) => w && w.toLowerCase() !== 'and');

// "yss" for Yi Sun-shin: first letters only for names of two words or more,
// so a short query does not match half the roster.
const initialsOf = (hero: string) => {
  const words = wordsOf(hero);
  return words.length > 1 ? normalize(words.map((w) => w[0]).join('')) : '';
};

// Letters changed, added, dropped or swapped to get from one to the other.
function typos(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Too short and a typo could be anything, so nothing under four letters.
const MIN_FOR_TYPOS = 4;
const typosAllowed = (q: string) => (q.length >= 6 ? 2 : 1);

// How far a query is from a hero, as a whole name, the start of one still being
// typed, or either of those for one of its words.
function typoDistance(q: string, hero: string) {
  const names = [hero, ...wordsOf(hero)].map(normalize).filter((n) => n.length >= 3);
  return Math.min(...names.flatMap((n) => [typos(q, n), typos(q, n.slice(0, q.length))]));
}

export function searchHeroes(query: string, heroes: string[], taken: string[] = []) {
  const q = normalize(query);
  if (!q) return [];
  const takenSet = new Set(taken);
  const open = heroes.filter((hero) => !takenSet.has(hero));
  const prefix: string[] = [];
  const short: string[] = [];
  const inner: string[] = [];
  for (const hero of open) {
    const at = normalize(hero).indexOf(q);
    if (at === 0) prefix.push(hero);
    else if (NICKNAMES[q] === hero || initialsOf(hero) === q) short.push(hero);
    else if (at > 0) inner.push(hero);
  }
  const found = [...prefix, ...short, ...inner];
  // An exact match always wins: typos are only for when nothing else fits.
  if (found.length || q.length < MIN_FOR_TYPOS) return found;
  return open
    .map((hero) => ({ hero, off: typoDistance(q, hero) }))
    .filter((m) => m.off <= typosAllowed(q))
    // On a tie, the name starting the same way: people rarely miss the first letter.
    .sort((a, b) => a.off - b.off || Number(normalize(b.hero)[0] === q[0]) - Number(normalize(a.hero)[0] === q[0]))
    .map((m) => m.hero);
}

// One row at a thumb's height, plus the list's gap from the box.
const HERO_ROW = 44;
const LIST_GAP = 8;

/**
 * Where a list of matches goes: below if it fits, otherwise on the roomier side.
 * It may only get what that side has, or it runs off the screen.
 */
export function heroListPlace(rows: number, below: number, above: number) {
  const needed = rows * HERO_ROW + LIST_GAP;
  const up = below < needed && above > below;
  const room = Math.max((up ? above : below) - LIST_GAP, HERO_ROW);
  return { up, maxHeight: Math.min(room, needed - LIST_GAP) };
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
    'answer with hero names, one line each as hero: reason, the reason 10 words max',
    'do not suggest a hero already picked by either team',
    ...(WRITE_IN[draft.lang] ? [`write the reasons in ${WRITE_IN[draft.lang]}, hero names in English`] : []),
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

// Which language Gemini is told to answer in; English needs no telling.
const WRITE_IN: Record<Lang, string | null> = {
  en: null,
  ms: 'formal Malay (Bahasa Melayu)',
  id: 'Indonesian (Bahasa Indonesia)',
};

const ADVICE_LABELS: Record<Lang, { help: string; ult: string; win: string }> = {
  en: { help: 'Help first:', ult: 'Ult on:', win: 'Win condition:' },
  ms: { help: 'Bantu dahulu:', ult: 'Ult pada:', win: 'Syarat menang:' },
  id: { help: 'Bantu dulu:', ult: 'Ult ke:', win: 'Syarat menang:' },
};

// Gemini read "help first" as "deal with first" and named an enemy, so spell
// out who each line is about.
const ADVICE_MEANING =
  'the first label names a teammate from my team to support first, the second an enemy hero to use my ultimate on';
// With no teammate entered yet there is nobody to name, and Gemini fills the
// label with an enemy, so it is not asked for.
const ADVICE_NO_TEAM = 'the first label names an enemy hero to use my ultimate on';

export function buildPrompt(draft: Draft) {
  const blessing = BLESSINGS[draft.myLane];
  const damage = enemyDamage(draft.picks.enemy.map((p) => p.hero));
  const teammates = draft.picks.team.some((p) => p.hero !== draft.myHero);
  const meaning = teammates ? ADVICE_MEANING : ADVICE_NO_TEAM;
  const words = ADVICE_LABELS[draft.lang];
  const labels = [...(teammates ? [words.help] : []), words.ult, words.win];
  const asked = `then ${labels.length} short lines, each starting with its label: ${labels.join(', ')}`;
  return [
    `suggest mobile legends spell and item build for ${(draft.myHero || '...').toLowerCase()} (${laneLabel(draft.myLane)})`,
    '',
    `enemy pick: ${withLanes(draft.picks.enemy)}`,
    '',
    `my team pick: ${withLanes(draft.picks.team)}`,
    '',
    ...(damage
      ? [
          `enemy damage: ${damage.physical} physical, ${damage.magic} magic${damage.mixed ? `, ${damage.mixed} mixed` : ''}, so favour ${damage.lean} defense items`,
          '',
        ]
      : []),
    'answer short, no paragraphs:',
    '- first line: Battle spell: <name>',
    '- second line: Emblem: <name> (<its 3 talents>)',
    '- 6 items, numbered 1 to 6, names only, no other notes',
    '- order them by when to buy',
    ...(blessing ? [`- boots first, and name which ${blessing} to put on them`] : []),
    '',
    asked,
    meaning,
    ...(WRITE_IN[draft.lang]
      ? [
          `write in ${WRITE_IN[draft.lang]}; keep hero, item, spell and emblem names in English, and the labels Battle spell: and Emblem: as written`,
        ]
      : []),
  ].join('\n');
}

/** Whether there is anything on the board that clearing it would lose. */
export const isEmptyDraft = (draft: Draft) =>
  !draft.myHero && !draft.bans.length && !draft.picks.team.length && !draft.picks.enemy.length;

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
/**
 * Moves one pick to a lane. A hero already there takes the lane it left, so a
 * wrong guess is fixed in one tap rather than leaving two heroes in one lane.
 */
export function moveToLane(picks: Pick[], index: number, lane: Lane): Pick[] {
  const from = picks[index]?.lane;
  const other = picks.findIndex((p, i) => i !== index && p.lane === lane);
  return picks.map((p, i) => {
    if (i === index) return { ...p, lane };
    return i === other && from ? { ...p, lane: from } : p;
  });
}

export function laneClashes(picks: Pick[]): Lane[] {
  const seen = picks.map((p) => p.lane);
  return LANES
    .map((l) => l.key)
    .filter((lane) => seen.filter((l) => l === lane).length > 1);
}
