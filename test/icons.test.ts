import { test, expect } from 'vitest';
import { buildBlocks, itemOf, picksOf } from '../lib/icons';

test('a numbered build line gives the item name without its tag', () => {
  expect(itemOf('1. Tough Boots (Core)')).toBe('Tough Boots');
  expect(itemOf('3. **Antique Cuirass** (Situational)')).toBe('Antique Cuirass');
  expect(itemOf("4. Athena's Shield: blocks magic burst")).toBe("Athena's Shield");
});

test('a numbered line Gemini also put a bullet on still gives the item', () => {
  expect(itemOf('- 1. Tough Boots - Favor (Core)')).toBe('Tough Boots - Favor');
  expect(itemOf('* 2. **Dominance Ice** (Core)')).toBe('Dominance Ice');
});

test('a boots line keeps its blessing, since the shop names them together', () => {
  expect(itemOf('1. Tough Boots - Encourage (Core)')).toBe('Tough Boots - Encourage');
});

test('the battle spell line gives the spell name', () => {
  expect(itemOf('Battle spell: Flicker')).toBe('Flicker');
  expect(itemOf('- **Battle Spell:** Vengeance')).toBe('Vengeance');
  expect(itemOf('**Battle spell**: Flicker (to engage)')).toBe('Flicker');
});

test('the emblem line gives the emblem name', () => {
  expect(itemOf('Emblem: Support (Inspire, Bargain Hunter, Focusing Mark)')).toBe('Support');
  expect(itemOf('- **Emblem:** Tank')).toBe('Tank');
});

test('a spell written as a bare bullet still gives the spell name', () => {
  // Gemini sometimes drops the "Battle spell:" label and writes "- Flicker".
  expect(itemOf('- Flicker')).toBe('Flicker');
  expect(itemOf('* **Vengeance**')).toBe('Vengeance');
});

test('lines that are not an item or a spell give nothing', () => {
  expect(itemOf('Help mid first, then roam to gold.')).toBeNull();
  expect(itemOf('')).toBeNull();
  expect(itemOf('1.')).toBeNull();
});

test('consecutive item lines gather into one row; everything else stays a line', () => {
  const text = [
    'Battle Spell: Flicker',
    '1. Tough Boots - Favor (Core)',
    '- 2. Dominance Ice (Core)',
    '3. Athena\'s Shield (Situational)',
    '* Which lane to help first: Mid lane',
  ].join('\n');
  expect(buildBlocks(text)).toEqual([
    { line: 0 },
    { items: ['Tough Boots - Favor', 'Dominance Ice', "Athena's Shield"] },
    { line: 4 },
  ]);
});

test('an answer with no item lines is all lines', () => {
  expect(buildBlocks('Kagura\nHigh burst.')).toEqual([{ line: 0 }, { line: 1 }]);
});

test('a pick answer becomes chips: each hero line with its reason', () => {
  const text = 'Here are my picks:\n1. **Aurora**: Synergizes wonderfully with Kaja.\n- Gord - Effectively punishes Ling.\nVexana: Outmatches Xavier directly.\nAurora: again';
  expect(picksOf(text, ['Aurora', 'Gord', 'Vexana', 'Kaja'])).toEqual([
    { hero: 'Aurora', reason: 'Synergizes wonderfully with Kaja.' },
    { hero: 'Gord', reason: 'Effectively punishes Ling.' },
    { hero: 'Vexana', reason: 'Outmatches Xavier directly.' },
  ]);
});

test('a reason on the line under the name still belongs to that hero', () => {
  const heroes = ['Khufra', 'Chip', 'Nolan', 'Minotaur'];
  expect(picksOf('Khufra\nStops dashes.\n\nChip\nFast help.\n\nMinotaur\nHeals the team.', heroes)).toEqual([
    { hero: 'Khufra', reason: 'Stops dashes.' },
    { hero: 'Chip', reason: 'Fast help.' },
    { hero: 'Minotaur', reason: 'Heals the team.' },
  ]);
});

test('a reason under the name may open with an enemy, and is not taken for a pick', () => {
  const heroes = ['Khufra', 'Nolan'];
  expect(picksOf('Khufra\nNolan cannot dash past him.', heroes)).toEqual([
    { hero: 'Khufra', reason: 'Nolan cannot dash past him.' },
  ]);
});

test('a bare list of names stays a list, and a same line reason stays put', () => {
  const heroes = ['Khufra', 'Chip'];
  expect(picksOf('Khufra\nChip', heroes)).toEqual([{ hero: 'Khufra', reason: '' }, { hero: 'Chip', reason: '' }]);
  expect(picksOf('Khufra: stops dashes\nChip: fast help', heroes)).toEqual([
    { hero: 'Khufra', reason: 'stops dashes' },
    { hero: 'Chip', reason: 'fast help' },
  ]);
});

test('a heading before the first hero is ignored', () => {
  expect(picksOf('Here are my picks:\nKhufra: stops dashes', ['Khufra'])).toEqual([{ hero: 'Khufra', reason: 'stops dashes' }]);
});

test('an emblem written with the word emblem still gives its name', () => {
  expect(itemOf('Emblem: Tank Emblem (Agility, Wilderness Blessing, Concussive Blast)')).toBe('Tank');
  expect(itemOf('- **Emblem:** Support Emblem')).toBe('Support');
});

test('reasons written between items wait until the row of items is finished', () => {
  const text = [
    'Battle spell: Flicker',
    '1. Thunder Belt',
    '2. Antique Cuirass',
    "Antique Cuirass: for Lancelot's burst",
    "3. Athena's Shield",
    "Athena's Shield: for Luo Yi",
    '4. Immortality',
    'Help first: Aulus',
  ].join('\n');
  expect(buildBlocks(text)).toEqual([
    { line: 0 },
    { items: ['Thunder Belt', 'Antique Cuirass', "Athena's Shield", 'Immortality'] },
    { line: 3 },
    { line: 5 },
    { line: 7 },
  ]);
});

test('reasons after the items stay after them, ahead of the tips', () => {
  const text = ['1. Thunder Belt', '2. Antique Cuirass', 'Antique Cuirass: for Lancelot', 'Help first: Aulus'].join('\n');
  expect(buildBlocks(text)).toEqual([{ items: ['Thunder Belt', 'Antique Cuirass'] }, { line: 2 }, { line: 3 }]);
});

test('a line that merely mentions an item is not taken for its reason', () => {
  const text = ['1. Thunder Belt', 'Win condition: rush Thunder Belt early', '2. Immortality'].join('\n');
  expect(buildBlocks(text)).toEqual([{ items: ['Thunder Belt'] }, { line: 1 }, { items: ['Immortality'] }]);
});
