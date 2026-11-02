import { NextResponse } from 'next/server';
import { picksFrom, rankedFor } from '@/lib/matchups';

// The best heroes for my lane on the board as it stands, straight from match
// data: no Gemini, so it answers in a moment and costs no ask. As many as
// Gemini chooses from, so any it picks has its numbers on its chip too.
const INSTANT_PICKS = 8;

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
