import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPrompt, buildPrompt } from '../public/draft.js';

const draft = {
  myLane: 'mid',
  picks: {
    enemy: [{ hero: 'Eudora', lane: 'mid' }, { hero: 'Masha', lane: 'roam' }],
    team: [{ hero: 'Lukas', lane: 'jungle' }, { hero: 'Marcel', lane: 'roam' }],
  },
  myHero: 'Rafaela',
};

test('pick prompt asks for my lane and lists picks with their lanes', () => {
  assert.equal(pickPrompt(draft), [
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
  const empty = { ...draft, picks: { enemy: [], team: [] } };
  assert.match(pickPrompt(empty), /enemy pick: none\n\nmy team pick: none\n/);
});

test('build prompt names my hero and lane and asks for the gameplay guide', () => {
  assert.equal(buildPrompt(draft), [
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
  const noHero = { ...draft, myHero: '' };
  assert.match(buildPrompt(noHero), /^suggest spell and item build for \.\.\. \(mid lane\)/);
});

test('every lane key renders its in-game wording', () => {
  const lanes = ['exp', 'mid', 'jungle', 'gold', 'roam'];
  const picks = lanes.map((lane, i) => ({ hero: ['Lukas','Eudora','Masha','Layla','Rafaela'][i], lane }));
  const d = { ...draft, picks: { enemy: picks, team: [] } };
  assert.match(pickPrompt(d), /enemy pick: lukas \(exp lane\) eudora \(mid lane\) masha \(jungling\) layla \(gold lane\) rafaela \(roaming\)/);
});
