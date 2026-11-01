import { NextResponse } from 'next/server';
import { picksFrom, rankedFor } from '@/lib/matchups';

// The best few heroes for my lane on the board as it stands, straight from
// match data: no Gemini, so it answers in a moment and costs no ask.
const INSTANT_PICKS = 3;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request body.' }, { status: 400 });
  }
  const picks = picksFrom((body as { picks?: unknown } | null)?.picks);
  if (!picks) return NextResponse.json({ error: 'No board to rank.' }, { status: 400 });
  const { ranked } = await rankedFor(picks, INSTANT_PICKS).catch(() => ({ ranked: [] }));
  return NextResponse.json(ranked);
}
