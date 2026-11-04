import { test, expect } from 'vitest';
import { heroListPlace, searchHeroes } from '../lib/draft';
import { HEROES as ROSTER } from '../lib/heroes';

const HEROES = ['Rafaela', 'Ruby', 'Eudora', 'Yi Sun-shin', 'X.Borg', 'Popol and Kupa'];

test('matches heroes by prefix, case-insensitively', () => {
  expect(searchHeroes('ru', HEROES)).toEqual(['Ruby']);
});

test('matches anywhere inside the name', () => {
  expect(searchHeroes('sun', HEROES)).toEqual(['Yi Sun-shin']);
});

test('ranks prefix matches above mid-name matches', () => {
  expect(searchHeroes('ra', HEROES)).toEqual(['Rafaela', 'Eudora']);
});

test('returns nothing for an empty query', () => {
  expect(searchHeroes('   ', HEROES)).toEqual([]);
});

test('ignores punctuation in the hero name', () => {
  expect(searchHeroes('xborg', HEROES)).toEqual(['X.Borg']);
});

test('excludes heroes already taken', () => {
  expect(searchHeroes('ru', HEROES, ['Ruby'])).toEqual([]);
});

test('first letters find a name of two words or more', () => {
  expect(searchHeroes('yss', ROSTER)).toEqual(['Yi Sun-shin']);
  expect(searchHeroes('yz', ROSTER)).toEqual(['Yu Zhong']);
  expect(searchHeroes('ly', ROSTER)).toContain('Luo Yi');
});

test('nicknames find their hero', () => {
  expect(searchHeroes('pk', ROSTER)).toEqual(['Popol and Kupa']);
  expect(searchHeroes('gwen', ROSTER)).toEqual(['Guinevere']);
});

test('a close misspelling still finds the hero', () => {
  expect(searchHeroes('gunevere', ROSTER)).toEqual(['Guinevere']);
  expect(searchHeroes('hayabusha', ROSTER)).toEqual(['Hayabusa']);
  expect(searchHeroes('lancleot', ROSTER)).toEqual(['Lancelot']);
  expect(searchHeroes('silvana', ROSTER)).toEqual(['Silvanna']);
});

test('a typo in a name still being typed finds it too', () => {
  expect(searchHeroes('hayb', ROSTER)).toContain('Hayabusa');
});

test('a typo in one word of a name finds it', () => {
  expect(searchHeroes('kuppa', ROSTER)).toEqual(['Popol and Kupa']);
});

test('typos give way to any exact match', () => {
  expect(searchHeroes('nana', ROSTER)).toEqual(['Nana']);
});

test('very short queries and nonsense match nothing by typo', () => {
  expect(searchHeroes('zq', ROSTER)).toEqual([]);
  expect(searchHeroes('qqqqqq', ROSTER)).toEqual([]);
});

test('a hero already taken is not found by nickname, first letters or typo', () => {
  expect(searchHeroes('pk', ROSTER, ['Popol and Kupa'])).toEqual([]);
  expect(searchHeroes('yss', ROSTER, ['Yi Sun-shin'])).toEqual([]);
  expect(searchHeroes('gunevere', ROSTER, ['Guinevere'])).toEqual([]);
});

test('typing any hero in full finds that hero first', () => {
  expect(ROSTER.filter((h) => searchHeroes(h, ROSTER)[0] !== h)).toEqual([]);
});

test('between equally close typos, the name starting the same way comes first', () => {
  expect(searchHeroes('nann', ROSTER)[0]).toBe('Nana');
});

test('a list that fits below stays below, even with more room above', () => {
  expect(heroListPlace(1, 100, 300)).toEqual({ up: false, maxHeight: 44 });
});

test('a list that does not fit below opens on the roomier side', () => {
  expect(heroListPlace(6, 100, 500).up).toBe(true);
  expect(heroListPlace(6, 120, 80).up).toBe(false);
});

test('with no room for the whole list, it is cut to fit and scrolls rather than leave the screen', () => {
  expect(heroListPlace(6, 100, 90)).toEqual({ up: false, maxHeight: 92 });
  expect(heroListPlace(6, 60, 120)).toEqual({ up: true, maxHeight: 112 });
});

test('a list always keeps at least one row', () => {
  expect(heroListPlace(3, 10, 5).maxHeight).toBe(44);
});
