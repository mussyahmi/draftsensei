import { test, expect } from 'vitest';
import { pickPrompt, buildPrompt } from '../lib/draft';
import type { Draft } from '../lib/draft';

const draft: Draft = {
  myLane: 'mid',
  picks: {
    enemy: [{ hero: 'Eudora', lane: 'mid' }, { hero: 'Masha', lane: 'roam' }],
    team: [{ hero: 'Lukas', lane: 'jungle' }, { hero: 'Marcel', lane: 'roam' }],
  },
  myHero: 'Rafaela',
};

test('pick prompt asks for my lane and lists picks with their lanes', () => {
  expect(pickPrompt(draft)).toBe([
    'suggest mid lane hero',
    '',
    'enemy pick: eudora (mid lane) masha (roaming)',
    '',
    'my team pick: lukas (jungling) marcel (roaming)',
    '',
    'answer with hero names, each with a reason of 6 words max',
  ].join('\n'));
});

test('pick prompt says none for a side with no picks yet', () => {
  const empty: Draft = { ...draft, picks: { enemy: [], team: [] } };
  expect(pickPrompt(empty)).toMatch(/enemy pick: none\n\nmy team pick: none\n/);
});

test('build prompt names my hero and lane and asks for the gameplay guide', () => {
  expect(buildPrompt(draft)).toBe([
    'suggest spell and item build for rafaela (mid lane)',
    '',
    'enemy pick: eudora (mid lane) masha (roaming)',
    '',
    'my team pick: lukas (jungling) marcel (roaming)',
    '',
    'answer short, no paragraphs:',
    '- battle spell',
    '- 6 items in build order, names only, each marked core or situational',
    '- mark as many core as this hero really needs, do not force 3 and 3',
    '- order by when to buy, so a situational item can come before a core one',
    '',
    'then 3 short lines: which lane to help first, who to use my ult on, our win condition',
  ].join('\n'));
});

test('build prompt leaves a blank for the hero until one is chosen', () => {
  expect(buildPrompt({ ...draft, myHero: '' })).toMatch(/^suggest spell and item build for \.\.\. \(mid lane\)/);
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
