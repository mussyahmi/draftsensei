import { test, expect } from 'vitest';
import { newer, readSnapshot, type Snapshot } from '../lib/sync';
import { newDraft, newPool } from '../lib/draft';

const snap = (updatedAt: number, myHero = ''): Snapshot => ({
  step: 1,
  draft: { ...newDraft(), myHero },
  pool: newPool(),
  updatedAt,
});

test('the more recently saved side wins', () => {
  expect(newer(snap(100, 'local'), snap(200, 'remote'))?.draft.myHero).toBe('remote');
  expect(newer(snap(300, 'local'), snap(200, 'remote'))?.draft.myHero).toBe('local');
});

test('a tie keeps what is already on this device', () => {
  expect(newer(snap(200, 'local'), snap(200, 'remote'))?.draft.myHero).toBe('local');
});

test('whichever side is missing, the other one wins', () => {
  expect(newer(null, snap(1, 'remote'))?.draft.myHero).toBe('remote');
  expect(newer(snap(1, 'local'), null)?.draft.myHero).toBe('local');
  expect(newer(null, null)).toBe(null);
});

test('a well-formed stored document reads back whole', () => {
  const stored = snap(42, 'Kagura');
  expect(readSnapshot(stored)).toEqual(stored);
});

test('a document saved by an older version still reads, with gaps filled', () => {
  const read = readSnapshot({ draft: { myHero: 'Kagura' }, updatedAt: 7 });
  expect(read).toEqual({
    step: 1,
    draft: { ...newDraft(), myHero: 'Kagura' },
    pool: newPool(),
    updatedAt: 7,
  });
});

test('anything that is not a document reads as nothing', () => {
  expect(readSnapshot(null)).toBe(null);
  expect(readSnapshot(undefined)).toBe(null);
  expect(readSnapshot('nope')).toBe(null);
  expect(readSnapshot(42)).toBe(null);
});

test('a document with no usable draft reads as nothing', () => {
  expect(readSnapshot({ updatedAt: 7 })).toBe(null);
});
