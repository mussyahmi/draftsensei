import { test, expect, vi, afterEach } from 'vitest';
import { POST } from '../app/api/ask/route';
import { MODEL_TIMEOUT_MS, SEARCH_TIMEOUT_MS } from '../lib/gemini';
import { forgetArena } from '../lib/arena';
import { countAsk } from '../lib/quota-store';

// The shared count lives in Firestore; here it is a stub that says 42.
vi.mock('../lib/quota-store', () => ({ countAsk: vi.fn(async () => 42) }));

const ask = (
  prompt = 'suggest mobile legends mid lane hero',
  build?: boolean,
  picks?: unknown,
  mine?: { hero: string; lane: string },
) =>
  POST(new Request('http://localhost/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, build, picks, ...mine }),
  }));

const searched = (init: RequestInit) => 'tools' in JSON.parse(String(init.body));
const promptOf = (init: RequestInit) =>
  JSON.parse(String(init.body)).contents[0].parts[0].text as string;

// The item shop as Rone Arena serves it; anything else fetched is Gemini.
const shop = (url: string) =>
  url.includes('arena.rone.dev')
    ? new Response(JSON.stringify(
        url.includes('/spells')
          ? { data: { records: [] } }
          : { data: { records: [
              { data: { equipname: 'Dominance Ice', equipicon: '' } },
              { data: { equipname: 'Twilight Armor (Discarded)', equipicon: '' } },
            ] } },
      ))
    : null;

const answer = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_TIMEOUT_MS = '50';

afterEach(() => {
  vi.unstubAllGlobals();
  forgetArena();
});

test('only gemini-3.5-flash-lite is asked, and only once', async () => {
  const seen: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    seen.push(url);
    return answer('Kagura');
  });

  const res = await ask();
  expect(await res.json()).toMatchObject({ text: 'Kagura', model: 'gemini-3.5-flash-lite' });
  expect(seen).toEqual([expect.stringContaining('/models/gemini-3.5-flash-lite:generateContent')]);
});

test('a used-up quota says so in Google\'s words', async () => {
  vi.stubGlobal('fetch', async () => new Response('You exceeded your current quota', { status: 429 }));

  const res = await ask();
  expect(res.status).toBe(429);
  expect((await res.json()).error).toMatch(/gemini-3.5-flash-lite: You exceeded your current quota/);
});

test('a stalled model reports a timeout rather than a dead connection', async () => {
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) =>
    new Promise((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));

  const res = await ask();
  expect(res.status).toBe(504);
  expect((await res.json()).error).toMatch(/too long/i);
});

test('a build ask tries Google Search first and says so', async () => {
  const calls: boolean[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const arena = shop(url);
    if (arena) return arena;
    calls.push(searched(init));
    return answer('Tough Boots');
  });

  const res = await ask('suggest a build', true);
  expect(await res.json()).toMatchObject({ text: 'Tough Boots', searched: true });
  expect(calls).toEqual([true]);
});

test('a refused search falls back to a plain ask instead of failing', async () => {
  // Free keys get no search quota on Gemini 3 models, and Google may answer
  // 400 for a model that cannot search at all; neither should sink the build.
  const calls: boolean[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const arena = shop(url);
    if (arena) return arena;
    calls.push(searched(init));
    return calls.length === 1
      ? new Response('search not allowed', { status: 400 })
      : answer('Tough Boots');
  });

  const res = await ask('suggest a build', true);
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ text: 'Tough Boots', searched: false });
  expect(calls).toEqual([true, false]);
});

test('a build ask tells Gemini which items are still in the shop', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const arena = shop(url);
    if (arena) return arena;
    sent = promptOf(init);
    return answer('Dominance Ice');
  });

  await ask('suggest a build', true);
  expect(sent).toMatch(/^suggest a build\n\n/);
  expect(sent).toMatch(/only use items from this list.*\nDominance Ice$/);
  expect(sent).not.toMatch(/Twilight Armor/);
});

// Angela's top roam builds as the Academy serves them, plus what it takes to
// name their items and talents.
const builds = (url: string) => {
  const page = (records: unknown[]) => new Response(JSON.stringify({ data: { records } }));
  if (url.includes('/heroes?size')) return page([{ data: { hero_id: 47, hero: { data: { name: 'Angela' } } } }]);
  if (url.includes('/47/builds?lane=roam')) {
    return page([{ data: { build: [{
      build_win_rate: 0.569, build_pick_rate: 0.129,
      battleskill: { data: { __data: { skillname: 'Flicker' } } },
      emblem: { data: { emblemname: 'Support' } },
      equipid: [1, 2], new_rune_skill: [611],
    }] } }]);
  }
  if (url.includes('/emblems')) return page([{ data: { giftid: 611, emblemskill: { skillname: 'Inspire' } } }]);
  if (url.includes('/equipment')) {
    return page([
      { data: { equipid: 1, equipname: 'Flask of the Oasis', equipicon: '' } },
      { data: { equipid: 2, equipname: 'Glowing Wand', equipicon: '' } },
    ]);
  }
  if (url.includes('arena.rone.dev')) return page([]);
  return null;
};

test('a build ask has Gemini adjust the build the player already sees', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const arena = builds(url);
    if (arena) return arena;
    sent = promptOf(init);
    return answer('Flicker');
  });

  await ask('suggest a build', true, undefined, { hero: 'Angela', lane: 'roam' });
  expect(sent).toContain([
    'the build the player already sees, from ranked games (56.9% win):',
    'flicker, support emblem (inspire)',
    'items: flask of the oasis, glowing wand',
    'adjust it for this enemy team: keep its battle spell, emblem and talents, keep every item that still fits, and swap only the items this enemy team calls for',
    'once all 6 items are listed, for each item you swapped in, add one line with no number or bullet, as item name: the enemy it is for, 6 words max; no such line for an item you kept',
  ].join('\n'));
});

test('with no build played widely enough to show, Gemini gets the top builds to start from', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    if (url.includes('/47/builds?lane=roam')) {
      return new Response(JSON.stringify({ data: { records: [{ data: { build: [{
        build_win_rate: 0.569, build_pick_rate: 0.02,
        battleskill: { data: { __data: { skillname: 'Flicker' } } },
        emblem: { data: { emblemname: 'Support' } },
        equipid: [1, 2], new_rune_skill: [611],
      }] } }] } }));
    }
    const arena = builds(url);
    if (arena) return arena;
    sent = promptOf(init);
    return answer('Flicker');
  });

  await ask('suggest a build', true, undefined, { hero: 'Angela', lane: 'roam' });
  expect(sent).toContain([
    'top builds for this hero and lane from ranked games:',
    '56.9% win, 2.0% pick: flicker, support emblem (inspire), core items flask of the oasis, glowing wand',
    'start from the best of these: keep its battle spell, emblem, talents and core items, and choose the other items for this enemy team',
  ].join('\n'));
});

test('a build ask still goes out when the item list cannot be fetched', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    if (url.includes('arena.rone.dev')) return new Response('down', { status: 503 });
    sent = promptOf(init);
    return answer('Dominance Ice');
  });

  const res = await ask('suggest a build', true);
  expect(res.status).toBe(200);
  expect(sent).toBe('suggest a build');
});

test('a hero pick ask carries no item list', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const arena = shop(url);
    if (arena) return arena;
    sent = promptOf(init);
    return answer('Kagura');
  });

  await ask('suggest mid lane hero');
  expect(sent).toBe('suggest mid lane hero');
});

// Match stats as Rone Arena serves them: Sun (27) is the enemy, Tigreal (60)
// is on my team, and three roamers are in the running.
const stats = (url: string) => {
  const hero = (hero_id: number, name: string) => ({ data: { hero_id, hero: { data: { name } } } });
  const table = (rows: [number, number][]) => ({
    data: { records: [{ data: { sub_hero: rows.map(([heroid, increase_win_rate]) => ({ heroid, increase_win_rate })) } }] },
  });
  if (url.includes('/heroes?size')) {
    return { data: { records: [hero(27, 'Sun'), hero(60, 'Tigreal'), hero(1, 'Franco'), hero(2, 'Akai'), hero(3, 'Diggie')] } };
  }
  // The API's sign: how Sun does against each, so a good counter is negative.
  if (url.includes('/27/counters')) return table([[1, -0.01], [2, 0.02], [3, -0.031]]);
  if (url.includes('/60/teammates')) return table([[1, 0.005], [2, 0.04]]);
  return null;
};

const roamPicks = { lane: 'roam', enemy: ['Sun'], team: ['Tigreal'], pool: [] };

test('a hero pick ask hands Gemini real counters for my lane', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const body = stats(url);
    if (body) return new Response(JSON.stringify(body));
    sent = promptOf(init);
    return answer('Diggie');
  });

  await ask('suggest roam hero', false, roamPicks);
  expect(sent).toBe([
    'suggest roam hero',
    '',
    'match data from ranked games for heroes who play my lane: their win rate at my rank, then how much it changes against the enemy and with my team:',
    'diggie: +3.1% vs enemy (best into sun +3.1%), +0.0% with my team',
    'akai: -2.0% vs enemy, +4.0% with my team (best with tigreal +4.0%)',
    'franco: +1.0% vs enemy (best into sun +1.0%), +0.5% with my team (best with tigreal +0.5%)',
    'choose the best 3 from this match data, counting both their win rate and the changes; the player already sees these numbers, so no numbers or win rates in a reason: say what the hero does in this match, the ability or playstyle that stops a named enemy or helps a named teammate, and make each reason different from the others',
  ].join('\n'));
});

test('a hero pick ask still goes out when the match data cannot be fetched', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    if (url.includes('arena.rone.dev')) return new Response('down', { status: 503 });
    sent = promptOf(init);
    return answer('Diggie');
  });

  const res = await ask('suggest roam hero', false, roamPicks);
  expect(res.status).toBe(200);
  expect(sent).toBe('suggest roam hero');
});

test('with nobody picked yet there is no match data to add', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const body = stats(url);
    if (body) return new Response(JSON.stringify(body));
    sent = promptOf(init);
    return answer('Diggie');
  });

  await ask('suggest roam hero', false, { lane: 'roam', enemy: [], team: [], pool: [] });
  expect(sent).toBe('suggest roam hero');
});

test('an answer counts toward the shared allowance and reports the total', async () => {
  vi.mocked(countAsk).mockClear();
  vi.stubGlobal('fetch', async () => answer('Kagura'));

  const res = await ask();
  expect(await res.json()).toMatchObject({ text: 'Kagura', used: 42 });
  expect(countAsk).toHaveBeenCalledTimes(1);
});

test('an ask Google refused is not counted', async () => {
  vi.mocked(countAsk).mockClear();
  vi.stubGlobal('fetch', async () => new Response('You exceeded your current quota', { status: 429 }));

  await ask();
  expect(countAsk).not.toHaveBeenCalled();
});

test('a plain ask never searches', async () => {
  const calls: boolean[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    calls.push(searched(init));
    return answer('Kagura');
  });

  await ask();
  expect(calls).toEqual([false]);
});

test('the timeout leaves room for a search and a plain ask inside a 60s proxy', () => {
  expect(SEARCH_TIMEOUT_MS + MODEL_TIMEOUT_MS).toBeLessThan(60_000);
});

test('with nothing on the board, Gemini gets no matchup numbers', async () => {
  let sent = '';
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    const body = stats(url);
    if (body) return new Response(JSON.stringify(body));
    sent = promptOf(init);
    return answer('Diggie');
  });
  await ask('suggest roam hero', false, { lane: 'roam', enemy: [], team: [], pool: [] });
  expect(sent).toBe('suggest roam hero');
});
