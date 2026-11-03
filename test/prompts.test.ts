import { test, expect } from 'vitest';
import { pickPrompt, buildPrompt, newPool } from '../lib/draft';
import type { Draft } from '../lib/draft';

const draft: Draft = {
  myLane: 'mid',
  picks: {
    enemy: [{ hero: 'Eudora', lane: 'mid' }, { hero: 'Masha', lane: 'roam' }],
    team: [{ hero: 'Lukas', lane: 'jungle' }, { hero: 'Marcel', lane: 'roam' }],
  },
  myHero: 'Rafaela',
  bans: [],
  rank: 'all',
  lang: 'en',
};

test('pick prompt asks for my lane and lists picks with their lanes', () => {
  expect(pickPrompt(draft)).toBe([
    'suggest mobile legends mid lane hero',
    '',
    'enemy pick: eudora (mid lane) masha (roaming)',
    '',
    'my team pick: lukas (jungling) marcel (roaming)',
    '',
    'answer with hero names, one line each as hero: reason, the reason 10 words max',
    'do not suggest a hero already picked by either team',
  ].join('\n'));
});

test('pick prompt leaves out heroes the enemy or my team already took from my pool', () => {
  const pool = { ...newPool(), mid: ['Eudora', 'Lukas', 'Kagura', 'Lylia'] };
  expect(pickPrompt(draft, pool)).toMatch(/only suggest from my heroes: kagura, lylia$/);
});

test('pick prompt drops the pool limit when every hero in it is taken', () => {
  const pool = { ...newPool(), mid: ['Eudora', 'Lukas'] };
  expect(pickPrompt(draft, pool)).not.toMatch(/only suggest from my heroes/);
});

test('pick prompt lists bans so they are not suggested', () => {
  expect(pickPrompt({ ...draft, bans: ['Kagura', 'Ling'] })).toMatch(/\nbanned: kagura, ling\n/);
});

test('pick prompt leaves bans out when there are none', () => {
  expect(pickPrompt(draft)).not.toMatch(/banned/);
});

test('pick prompt says none for a side with no picks yet', () => {
  const empty: Draft = { ...draft, picks: { enemy: [], team: [] } };
  expect(pickPrompt(empty)).toMatch(/enemy pick: none\n\nmy team pick: none\n/);
});

test('build prompt names my hero and lane and asks for the gameplay guide', () => {
  expect(buildPrompt(draft)).toBe([
    'suggest mobile legends spell and item build for rafaela (mid lane)',
    '',
    'enemy pick: eudora (mid lane) masha (roaming)',
    '',
    'my team pick: lukas (jungling) marcel (roaming)',
    '',
    'answer short, no paragraphs:',
    '- first line: Battle spell: <name>',
    '- second line: Emblem: <name> (<its 3 talents>)',
    '- 6 items, numbered 1 to 6, names only, no other notes',
    '- order them by when to buy',
    '',
    'then 3 short lines, each starting with its label: Help first:, Ult on:, Win condition:',
    'the first label names a teammate from my team to support first, the second an enemy hero to use my ultimate on',
  ].join('\n'));
});

test('build prompt asks which roam blessing goes on the boots for a roamer', () => {
  expect(buildPrompt({ ...draft, myLane: 'roam' })).toMatch(
    /\n- boots first, and name which roam blessing to put on them\n/,
  );
});

test('build prompt asks which jungle blessing goes on the boots for a jungler', () => {
  expect(buildPrompt({ ...draft, myLane: 'jungle' })).toMatch(
    /\n- boots first, and name which jungle blessing to put on them\n/,
  );
});

test('build prompt asks for no blessing in a lane that does not use one', () => {
  expect(buildPrompt(draft)).not.toMatch(/blessing/);
});

test('build prompt leaves a blank for the hero until one is chosen', () => {
  expect(buildPrompt({ ...draft, myHero: '' })).toMatch(/^suggest mobile legends spell and item build for \.\.\. \(mid lane\)/);
});

test('every lane key renders its in-game wording', () => {
  const lanes = ['exp', 'mid', 'jungle', 'gold', 'roam'] as const;
  const heroes = ['Lukas', 'Eudora', 'Masha', 'Layla', 'Rafaela'];
  const picks = lanes.map((lane, i) => ({ hero: heroes[i], lane }));
  const d: Draft = { ...draft, picks: { enemy: picks, team: [] } };
  expect(pickPrompt(d)).toMatch(
    /enemy pick: lukas \(exp lane\) eudora \(mid lane\) masha \(jungling\) layla \(gold lane\) rafaela \(roaming\)/,
  );
});

test('build prompt tells Gemini what the enemy damage calls for, only when it leans', () => {
  const lean: Draft = {
    ...draft,
    picks: { ...draft.picks, enemy: ['Layla', 'Hayabusa', 'Saber', 'Nana'].map((hero) => ({ hero, lane: 'mid' as const })) },
  };
  expect(buildPrompt(lean)).toContain('enemy damage: 3 physical, 1 magic, so favour physical defense items');
  expect(buildPrompt(draft)).not.toContain('enemy damage');
});

test('build prompt asks who to help first only when there is a teammate to name', () => {
  const alone: Draft = { ...draft, myHero: 'Marcel', picks: { ...draft.picks, team: [{ hero: 'Marcel', lane: 'roam' }] } };
  expect(buildPrompt(alone)).toContain('then 2 short lines, each starting with its label: Ult on:, Win condition:');
  expect(buildPrompt(alone)).toContain('the first label names an enemy hero to use my ultimate on');
  expect(buildPrompt(alone)).not.toContain('Help first');
  expect(buildPrompt({ ...alone, lang: 'ms' })).toContain('Ult pada:, Syarat menang:');
  expect(buildPrompt({ ...alone, lang: 'ms' })).not.toContain('Bantu dahulu');
  const friend: Draft = { ...alone, picks: { ...alone.picks, team: [{ hero: 'Tigreal', lane: 'roam' }] } };
  expect(buildPrompt(friend)).toContain('Help first:, Ult on:, Win condition:');
});
