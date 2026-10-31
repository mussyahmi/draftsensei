import { NextResponse } from 'next/server';
import {
  DEFAULT_MODEL,
  FALLBACK_MODEL,
  endpoint,
  extractText,
  shouldTryNextModel,
  modelChain,
  requestBody,
  MODEL_TIMEOUT_MS,
  type GeminiPayload,
} from '@/lib/gemini';

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'No GEMINI_API_KEY set. Put it in .env.local and restart the server.' },
      { status: 500 },
    );
  }

  let prompt: unknown;
  try {
    ({ prompt } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Bad request body.' }, { status: 400 });
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'Nothing to ask.' }, { status: 400 });
  }

  const models = modelChain(
    process.env.GEMINI_MODEL || DEFAULT_MODEL,
    process.env.GEMINI_FALLBACK_MODEL || FALLBACK_MODEL,
  );

  const timeout = Number(process.env.GEMINI_TIMEOUT_MS) || MODEL_TIMEOUT_MS;

  let lastError = 'Gemini did not answer.';
  let timedOut = false;

  for (const model of models) {
    let response: Response;
    try {
      response = await fetch(endpoint(model), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(requestBody(prompt)),
        signal: AbortSignal.timeout(timeout),
      });
      timedOut = false;
    } catch {
      // Either the model stalled past our deadline or the network is gone.
      // Both are worth retrying on the next model; only the last one decides
      // what we tell the player.
      timedOut = true;
      lastError = `${model} took too long to answer.`;
      continue;
    }

    if (response.ok) {
      const text = extractText((await response.json()) as GeminiPayload).trim();
      if (!text) {
        lastError = 'Gemini answered with nothing.';
        continue;
      }
      return NextResponse.json({ text, model });
    }

    // Google puts a usable sentence in here; pass it through rather than
    // inventing our own, so a wrong model id or a dead key says so.
    const detail = await response.text();
    lastError = `${model}: ${detail.slice(0, 300)}`;
    if (!shouldTryNextModel(response.status)) {
      return NextResponse.json({ error: lastError }, { status: 502 });
    }
  }

  return NextResponse.json(
    { error: timedOut ? lastError : `No model could answer. ${lastError}` },
    { status: timedOut ? 504 : 429 },
  );
}
