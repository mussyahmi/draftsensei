import { test, expect } from 'vitest';
import { quotaDay, DAILY_LIMIT } from '../lib/quota';

test('the quota day turns over at midnight Pacific, when Google resets it', () => {
  // 1 Nov 2026 is still daylight time until 2am, so midnight is 07:00 UTC.
  expect(quotaDay(new Date('2026-11-01T06:59:00Z'))).toBe('2026-10-31');
  expect(quotaDay(new Date('2026-11-01T07:00:00Z'))).toBe('2026-11-01');
});

test('in standard time midnight Pacific is 08:00 UTC', () => {
  expect(quotaDay(new Date('2026-12-01T07:59:00Z'))).toBe('2026-11-30');
  expect(quotaDay(new Date('2026-12-01T08:00:00Z'))).toBe('2026-12-01');
});

test('the free daily allowance is 500 asks', () => {
  expect(DAILY_LIMIT).toBe(500);
});
