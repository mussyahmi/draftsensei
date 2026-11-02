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
