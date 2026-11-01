import { NextResponse } from 'next/server';
import {
  DEFAULT_MODEL,
  endpoint,
  extractText,
  requestBody,
  MODEL_TIMEOUT_MS,
  type GeminiPayload,
} from '@/lib/gemini';
import { loadCatalog } from '@/lib/arena';
import { matchupData, picksFrom } from '@/lib/matchups';
import { countAsk } from '@/lib/quota-store';

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'No GEMINI_API_KEY set. Put it in .env.local and restart the server.' },
      { status: 500 },
    );
  }

  let prompt: unknown;
  let build: unknown;
  let picks: unknown;
  try {
    ({ prompt, build, picks } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Bad request body.' }, { status: 400 });
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'Nothing to ask.' }, { status: 400 });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const timeout = Number(process.env.GEMINI_TIMEOUT_MS) || MODEL_TIMEOUT_MS;

  // Gemini remembers items from whenever it was trained, including ones the
  // game has since removed. Hand it this patch's shop so it picks from that.
  // Without the list the build is still worth asking for.
  let asking = prompt;
  if (build === true) {
    const catalog = await loadCatalog().catch(() => null);
    if (catalog?.items.length) {
      asking = [
        prompt,
        '',
        'only use items from this list, written exactly as listed:',
        catalog.items.join('\n'),
      ].join('\n');
    }
  }

  // Gemini guesses at counters; the Academy has them from real ranked games.
  // Give it the best of those for my lane and let it pick and explain.
  const board = build === true ? null : picksFrom(picks);
  if (board) {
    const lines = await matchupData(board).catch(() => []);
    if (lines.length) {
      asking = [
        prompt,
        '',
        'match data from ranked games, win rate change for heroes who play my lane:',
        ...lines,
        'choose the best 3 from this match data; in each reason name the enemy hero it counters best, in your own words',
      ].join('\n');
    }
  }

  const ask = (withSearch: boolean) =>
    fetch(endpoint(model), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(requestBody(asking, withSearch)),
      signal: AbortSignal.timeout(timeout),
    });

  // A build tries search first. Free keys have no search quota on Gemini 3
  // models, so a refusal, a stall or an empty answer here just means asking
  // again without it rather than failing the build.
  if (build === true) {
    try {
      const response = await ask(true);
      if (response.ok) {
        const text = extractText((await response.json()) as GeminiPayload).trim();
        if (text) return NextResponse.json({ text, model, searched: true, used: await countAsk() });
      }
    } catch {
      // Fall through to the plain ask.
    }
  }

  let response: Response;
  try {
    response = await ask(false);
  } catch {
    // Either the model stalled past our deadline or the network is gone.
    return NextResponse.json({ error: `${model} took too long to answer.` }, { status: 504 });
  }

  if (!response.ok) {
    // Google puts a usable sentence in here; pass it through rather than
    // inventing our own, so a used-up quota, a wrong model id or a dead key
    // says so.
    const detail = await response.text();
    return NextResponse.json(
      { error: `${model}: ${detail.slice(0, 300)}` },
      { status: response.status === 429 ? 429 : 502 },
    );
  }

  const text = extractText((await response.json()) as GeminiPayload).trim();
  if (!text) {
    return NextResponse.json({ error: 'Gemini answered with nothing.' }, { status: 502 });
  }
  // Every answer comes out of the one daily allowance all visitors share;
  // count it where everyone can see. A refused ask cost nothing, so it is not.
  return NextResponse.json({ text, model, searched: false, used: await countAsk() });
}
