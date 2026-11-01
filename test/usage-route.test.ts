import { test, expect, vi } from 'vitest';
import { GET } from '../app/api/usage/route';

vi.mock('../lib/quota-store', () => ({ asksToday: vi.fn(async () => 123) }));

test('the header gets today\'s shared count out of the daily limit', async () => {
  const res = await GET();
  expect(await res.json()).toEqual({ used: 123, limit: 500 });
});
