import { test, expect } from 'vitest';
import { countToday, recordAsk } from '../lib/usage';

test('a fresh record counts nothing today', () => {
  expect(countToday(null, '2026-10-31')).toBe(0);
});

test('recording an ask counts it for that day', () => {
  const after = recordAsk(null, '2026-10-31');
  expect(countToday(after, '2026-10-31')).toBe(1);
});

test('asks on the same day add up', () => {
  let r = recordAsk(null, '2026-10-31');
  r = recordAsk(r, '2026-10-31');
  r = recordAsk(r, '2026-10-31');
  expect(countToday(r, '2026-10-31')).toBe(3);
});

test('a new day starts the count over', () => {
  const r = recordAsk(recordAsk(null, '2026-10-31'), '2026-10-31');
  expect(countToday(r, '2026-11-01')).toBe(0);
  expect(countToday(recordAsk(r, '2026-11-01'), '2026-11-01')).toBe(1);
});
