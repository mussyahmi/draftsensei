import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchHeroes } from '../public/draft.js';

const HEROES = ['Rafaela', 'Ruby', 'Eudora', 'Yi Sun-shin', 'X.Borg', 'Popol and Kupa'];

test('matches heroes by prefix, case-insensitively', () => {
  assert.deepEqual(searchHeroes('ru', HEROES), ['Ruby']);
});

test('matches anywhere inside the name', () => {
  assert.deepEqual(searchHeroes('sun', HEROES), ['Yi Sun-shin']);
});

test('ranks prefix matches above mid-name matches', () => {
  assert.deepEqual(searchHeroes('ra', HEROES), ['Rafaela', 'Eudora']);
});

test('returns nothing for an empty query', () => {
  assert.deepEqual(searchHeroes('   ', HEROES), []);
});

test('ignores punctuation in the hero name', () => {
  assert.deepEqual(searchHeroes('xborg', HEROES), ['X.Borg']);
});

test('excludes heroes already taken', () => {
  assert.deepEqual(searchHeroes('ru', HEROES, ['Ruby']), []);
});
