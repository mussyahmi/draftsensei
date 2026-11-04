import { NextResponse } from 'next/server';
import { loadGains } from '@/lib/arena';
import { RANKS } from '@/lib/draft';
import { HEROES } from '@/lib/heroes';
import { biggestThreats } from '@/lib/threat';

const heroes = (v: unknown): string[] | null =>
  Array.isArray(v) && v.length <= 5 && v.every((h) => typeof h === 'string' && HEROES.includes(h)) ? (v as string[]) : null;

// Which enemies so far are hardest on my team so far, while there is still time
// to answer it.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request body.' }, { status: 400 });
  }
  const [team, enemy] = [heroes(body?.team), heroes(body?.enemy)];
  if (!team || !enemy) return NextResponse.json({ error: 'Need the two teams.' }, { status: 400 });
  const rank = RANKS.find((r) => r.key === body.rank)?.key ?? 'all';
  const tables = await Promise.allSettled(enemy.map((e) => loadGains(e, 'counters', rank)));
  const against = new Map(tables.flatMap((r, i) => (r.status === 'fulfilled' ? [[enemy[i], r.value] as const] : [])));
  return NextResponse.json(biggestThreats(team, enemy, against));
}
