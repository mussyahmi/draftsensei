import { test, expect, vi, afterEach } from 'vitest';
import { POST } from '../app/api/ask/route';
import { MODEL_TIMEOUT_MS } from '../lib/gemini';

const ask = (prompt = 'suggest mobile legends mid lane hero') =>
  POST(new Request('http://localhost/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  }));

const answer = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_TIMEOUT_MS = '50';

afterEach(() => void vi.unstubAllGlobals());

test('a model that never answers is abandoned for the next one', async () => {
  const seen: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    seen.push(url);
    if (seen.length === 1) {
      // Hang until the route's own signal aborts us, as a stalled model does.
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    return answer('Kagura');
  });

  const res = await ask();
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ text: 'Kagura' });
  expect(seen).toHaveLength(2);
});

test('the whole chain stalling reports a timeout rather than a dead connection', async () => {
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) =>
    new Promise((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));

  const res = await ask();
  expect(res.status).toBe(504);
  expect((await res.json()).error).toMatch(/too long/i);
});

test('the timeout leaves room for both models inside a 60s proxy', () => {
  expect(MODEL_TIMEOUT_MS * 2).toBeLessThan(60_000);
});
