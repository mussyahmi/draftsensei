import { test, expect } from 'vitest';
import { buildsFrom, buildLines, type Build } from '../lib/builds';

const items = new Map([[1, 'Flask of the Oasis'], [2, 'Glowing Wand'], [3, 'Enchanted Talisman'], [4, 'Fleeting Time']]);
const talents = new Map([[611, 'Inspire'], [621, 'Bargain Hunter'], [831, 'Focusing Mark']]);
const build = (win: number, pick: number, equipid: number[]) => ({
  build_win_rate: win,
  build_pick_rate: pick,
  battleskill: { data: { __data: { skillname: 'Flicker' } } },
  emblem: { data: { emblemname: 'Support' } },
  equipid,
  new_rune_skill: [611, 621, 831],
});
const page = { data: { records: [{ data: { build: [build(0.563, 0.113, [1, 4, 2]), build(0.569, 0.129, [1, 2, 3])] } }] } };

test('builds come out best win rate first, with names for items and talents', () => {
  expect(buildsFrom(page, items, talents)).toEqual([
    { winRate: 0.569, pickRate: 0.129, spell: 'Flicker', emblem: 'Support', talents: ['Inspire', 'Bargain Hunter', 'Focusing Mark'], items: ['Flask of the Oasis', 'Glowing Wand', 'Enchanted Talisman'] },
    { winRate: 0.563, pickRate: 0.113, spell: 'Flicker', emblem: 'Support', talents: ['Inspire', 'Bargain Hunter', 'Focusing Mark'], items: ['Flask of the Oasis', 'Fleeting Time', 'Glowing Wand'] },
  ]);
});

test('an item or talent the shop no longer knows is left out, not shown as a number', () => {
  const [b] = buildsFrom({ data: { records: [{ data: { build: [build(0.5, 0.1, [1, 999])] } }] } }, items, new Map());
  expect(b.items).toEqual(['Flask of the Oasis']);
  expect(b.talents).toEqual([]);
});

test('no builds for a hero and lane is an empty list', () => {
  expect(buildsFrom({ data: { records: [] } }, items, talents)).toEqual([]);
});

test('the prompt lines read as a short ranked list', () => {
  const b: Build = { winRate: 0.569, pickRate: 0.129, spell: 'Flicker', emblem: 'Support', talents: ['Inspire', 'Bargain Hunter', 'Focusing Mark'], items: ['Flask of the Oasis', 'Glowing Wand', 'Enchanted Talisman'] };
  expect(buildLines([b])).toEqual([
    '56.9% win, 12.9% pick: flicker, support emblem (inspire, bargain hunter, focusing mark), core items flask of the oasis, glowing wand, enchanted talisman',
  ]);
});
