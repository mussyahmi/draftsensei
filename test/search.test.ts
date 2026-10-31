import { test, expect } from 'vitest';
import { searchHeroes } from '../lib/draft';

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
