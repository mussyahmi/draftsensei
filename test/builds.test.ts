import { test, expect } from 'vitest';
import { buildsFrom, buildLines, emblemName, fullBuild, type Build } from '../lib/builds';

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

test('the Academy\'s "All" emblem is called Common, as in the game', () => {
  expect(emblemName('All')).toBe('Common');
  expect(emblemName('Mage')).toBe('Mage');
});

const community = [
  ['Arcane Boots', 'Glowing Wand', 'Ice Queen Wand', 'Holy Crystal', 'Divine Glaive', 'Blood Wings'],
  ['Arcane Boots', 'Glowing Wand', 'Holy Crystal', 'Divine Glaive', 'Blood Wings', 'Winter Crown'],
  ['Magic Shoes', 'Ice Queen Wand', 'Holy Crystal', 'Glowing Wand', 'Blood Wings', 'Sky Piercer'],
  ['Arcane Boots', 'Lightning Truncheon', 'Holy Crystal', 'Divine Glaive', 'Winter Crown', 'Blood Wings'],
];

test('the core items are kept and topped up to six with what players agree on', () => {
  const items = fullBuild(['Glowing Wand', 'Lightning Truncheon', 'Divine Glaive'], community);
  expect(items).toHaveLength(6);
  expect(items).toEqual(expect.arrayContaining(['Glowing Wand', 'Lightning Truncheon', 'Divine Glaive', 'Arcane Boots', 'Holy Crystal', 'Blood Wings']));
});

test('items are in buying order, boots first', () => {
  const items = fullBuild(['Glowing Wand', 'Lightning Truncheon', 'Divine Glaive'], community);
  expect(items[0]).toBe('Arcane Boots');
  expect(items.indexOf('Blood Wings')).toBeGreaterThan(items.indexOf('Holy Crystal'));
});

test('one player\'s odd pick never makes it in, and only one pair of boots does', () => {
  const items = fullBuild([], community);
  expect(items).not.toContain('Sky Piercer');
  expect(items).not.toContain('Magic Shoes');
  expect(items.filter((i) => /boots|shoes/i.test(i))).toHaveLength(1);
});

test('with no community builds, the core items stand alone', () => {
  expect(fullBuild(['A', 'B', 'C'], [])).toEqual(['A', 'B', 'C']);
});

test('boots go in even when players split between kinds', () => {
  const split = [
    ['Arcane Boots', 'A', 'B', 'C'],
    ['Magic Shoes', 'A', 'B', 'C'],
    ['Arcane Boots', 'A', 'B', 'D'],
    ['Demon Shoes', 'A', 'C', 'D'],
  ];
  const items = fullBuild(['A', 'B', 'C'], split);
  expect(items[0]).toBe('Arcane Boots');
  expect(items).toHaveLength(5);
});
