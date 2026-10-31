const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function searchHeroes(query, heroes, taken = []) {
  const q = normalize(query);
  if (!q) return [];
  const takenSet = new Set(taken);
  const prefix = [];
  const inner = [];
  for (const hero of heroes) {
    if (takenSet.has(hero)) continue;
    const at = normalize(hero).indexOf(q);
    if (at === 0) prefix.push(hero);
    else if (at > 0) inner.push(hero);
  }
  return [...prefix, ...inner];
}

export const LANES = [
  { key: 'exp', label: 'exp lane' },
  { key: 'mid', label: 'mid lane' },
  { key: 'jungle', label: 'jungling' },
  { key: 'gold', label: 'gold lane' },
  { key: 'roam', label: 'roaming' },
];

export const laneLabel = (key) =>
  (LANES.find((l) => l.key === key) || { label: key }).label;

const names = (heroes) =>
  heroes.length ? heroes.map((h) => h.toLowerCase()).join(' ') : 'none';

const withLanes = (picks) =>
  picks.length
    ? picks.map((p) => `${p.hero.toLowerCase()} (${laneLabel(p.lane)})`).join(' ')
    : 'none';

export const newPool = () =>
  Object.fromEntries(LANES.map((l) => [l.key, []]));

export const poolFor = (pool, lane) => (pool && pool[lane]) || [];

export function pickPrompt(draft, pool) {
  const mine = poolFor(pool, draft.myLane);
  return [
    `suggest ${laneLabel(draft.myLane)} hero`,
    '',
    `enemy pick: ${withLanes(draft.picks.enemy)}`,
    '',
    `my team pick: ${withLanes(draft.picks.team)}`,
    '',
    'answer with hero names, each with a reason of 6 words max',
    ...(mine.length
      ? ['', `only suggest from my heroes: ${mine.map((h) => h.toLowerCase()).join(', ')}`]
      : []),
  ].join('\n');
}

export function buildPrompt(draft) {
  return [
    `suggest spell and item build for ${(draft.myHero || '...').toLowerCase()} (${laneLabel(draft.myLane)})`,
    '',
    `enemy pick: ${withLanes(draft.picks.enemy)}`,
    '',
    `my team pick: ${withLanes(draft.picks.team)}`,
    '',
    'answer short, no paragraphs:',
    '- battle spell',
    '- 6 items in build order, names only, each marked core or situational',
    '- mark as many core as this hero really needs, do not force 3 and 3',
    '- order by when to buy, so a situational item can come before a core one',
    '',
    'then 3 short lines: which lane to help first, who to use my ult on, our win condition',
  ].join('\n');
}

export const newDraft = () => ({
  myLane: 'mid',
  picks: { enemy: [], team: [] },
  myHero: '',
});

export function takenHeroes(draft) {
  return [
    ...draft.picks.enemy.map((p) => p.hero),
    ...draft.picks.team.map((p) => p.hero),
    ...(draft.myHero ? [draft.myHero] : []),
  ];
}

// Two heroes in the same lane means one of the auto-assigned lanes is wrong.
export function laneClashes(picks) {
  const seen = picks.map((p) => p.lane);
  return LANES
    .map((l) => l.key)
    .filter((lane) => seen.filter((l) => l === lane).length > 1);
}
