import { test, expect, vi, beforeEach } from 'vitest';
import { malaysiaTime, nextReset, pastDays } from '../lib/quota';
import { POST as visit } from '../app/api/visit/route';
import { GET as stats } from '../app/api/stats/route';
import { GET as owner } from '../app/api/owner/route';
import { countVisit } from '../lib/quota-store';

const verifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken }) }));
vi.mock('../lib/quota-store', () => ({
  VISIT_PAGES: ['draft', 'heroes'],
  adminApp: () => ({}),
  countVisit: vi.fn(async () => null),
  recentUsage: vi.fn(async () => [{ day: '2026-11-06', asks: 48, visits: { draft: 30, heroes: 7 } }]),
}));

beforeEach(() => {
  vi.mocked(countVisit).mockClear();
  verifyIdToken.mockReset();
  process.env.OWNER_EMAIL = 'Owner@Example.com';
});

const post = (body: unknown) =>
  visit(new Request('http://x/api/visit', { method: 'POST', body: JSON.stringify(body) }));
const get = (token?: string) =>
  stats(new Request('http://x/api/stats', token ? { headers: { authorization: `Bearer ${token}` } } : {}));

test('quota days step back by calendar date, today first, across a clock change', () => {
  // 2 Nov 2026 is the day after US clocks go back.
  expect(pastDays(3, new Date('2026-11-02T20:00:00Z'))).toEqual(['2026-11-02', '2026-11-01', '2026-10-31']);
  expect(pastDays(2, new Date('2026-03-01T12:00:00Z'))).toEqual(['2026-03-01', '2026-02-28']);
});

test('a page open is counted only for a known page', async () => {
  expect((await post({ page: 'heroes' })).status).toBe(204);
  expect(countVisit).toHaveBeenCalledWith('heroes');
  expect((await post({ page: 'admin' })).status).toBe(400);
  expect(countVisit).toHaveBeenCalledTimes(1);
});

test('stats need a signed-in token', async () => {
  expect((await get()).status).toBe(403);
  expect(verifyIdToken).not.toHaveBeenCalled();
});

test('stats are for the owner email only, verified, in any case', async () => {
  verifyIdToken.mockResolvedValue({ email: 'owner@example.com', email_verified: true });
  const res = await get('good');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    days: [{ day: '2026-11-06', asks: 48, visits: { draft: 30, heroes: 7 } }],
    limit: 500,
  });

  verifyIdToken.mockResolvedValue({ email: 'someone@example.com', email_verified: true });
  expect((await get('other')).status).toBe(403);
  verifyIdToken.mockResolvedValue({ email: 'owner@example.com', email_verified: false });
  expect((await get('unverified')).status).toBe(403);
  verifyIdToken.mockRejectedValue(new Error('expired'));
  expect((await get('bad')).status).toBe(403);
});

test('with no owner set, nobody sees the stats', async () => {
  delete process.env.OWNER_EMAIL;
  verifyIdToken.mockResolvedValue({ email: 'owner@example.com', email_verified: true });
  expect((await get('good')).status).toBe(403);
});

test('the quota resets at midnight Pacific, which is 4pm or 3pm in Malaysia', () => {
  // After US clocks go back: 08:00 UTC.
  const winter = nextReset(new Date('2026-11-06T03:00:00Z'));
  expect(winter.toISOString()).toBe('2026-11-06T08:00:00.000Z');
  expect(malaysiaTime(winter)).toMatch(/^4\s?pm$/i);
  // Summer time: 07:00 UTC.
  const summer = nextReset(new Date('2026-07-01T10:00:00Z'));
  expect(summer.toISOString()).toBe('2026-07-02T07:00:00.000Z');
  expect(malaysiaTime(summer)).toMatch(/^3\s?pm$/i);
});

test('the menu asks whether this account runs the app', async () => {
  verifyIdToken.mockResolvedValue({ email: 'owner@example.com', email_verified: true });
  const yes = await owner(new Request('http://x/api/owner', { headers: { authorization: 'Bearer good' } }));
  expect(await yes.json()).toEqual({ owner: true });
  const no = await owner(new Request('http://x/api/owner'));
  expect(await no.json()).toEqual({ owner: false });
});
