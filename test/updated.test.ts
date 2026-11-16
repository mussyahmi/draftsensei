import { test, expect } from 'vitest';
import { agoFrom, agoText } from '../lib/updated';

const at = Date.UTC(2026, 10, 13, 0, 0);
const later = (minutes: number) => at + minutes * 60_000;

test('picks the largest unit that fits', () => {
  expect(agoFrom(at, later(0.5))).toBe('now');
  expect(agoFrom(at, later(5))).toEqual({ value: 5, unit: 'minute' });
  expect(agoFrom(at, later(187))).toEqual({ value: 3, unit: 'hour' });
  expect(agoFrom(at, later(47 * 60))).toEqual({ value: 47, unit: 'hour' });
  expect(agoFrom(at, later(72 * 60))).toEqual({ value: 3, unit: 'day' });
});

test('reads in each language', () => {
  expect(agoText({ value: 3, unit: 'hour' }, 'en', 'just now')).toBe('3 hours ago');
  expect(agoText('now', 'ms', 'baru sahaja')).toBe('baru sahaja');
  expect(agoText({ value: 2, unit: 'day' }, 'id', '')).toMatch(/2 hari/);
});
