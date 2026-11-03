import { NextResponse } from 'next/server';
import { loadGains, loadMeta } from '@/lib/arena';
import { RANKS, type Rank } from '@/lib/draft';
import { draftCheck } from '@/lib/draft-check';
import { HEROES } from '@/lib/heroes';

const fullTeam = (v: unknown): string[] | null =>
  Array.isArray(v) && v.length === 5 && v.every((h) => typeof h === 'string' && HEROES.includes(h)) ? (v as string[]) : null;

// One hero's stats failing costs that hero's numbers, not the whole check.
const tables = async (heroes: string[], kind: 'counters' | 'teammates', rank: Rank) =>
  new Map(
    (await Promise.allSettled(heroes.map((h) => loadGains(h, kind, rank)))).flatMap((r, i) =>
      r.status === 'fulfilled' ? [[heroes[i], r.value] as const] : [],
    ),
  );

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request body.' }, { status: 400 });
  }
  const [team, enemy] = [fullTeam(body?.team), fullTeam(body?.enemy)];
  if (!team || !enemy) return NextResponse.json({ error: 'Both teams must be full.' }, { status: 400 });
  const rank = RANKS.find((r) => r.key === body.rank)?.key ?? 'all';
  const me = team.find((h) => h === body.me) ?? null;
  const opponent = enemy.find((h) => h === body.opponent) ?? null;
  // A counters table is the two-way matchup, so the enemy's five cover it.
  const [meta, against, alongside] = await Promise.all([
    loadMeta(rank).catch(() => []),
    tables(enemy, 'counters', rank),
    tables(team, 'teammates', rank),
  ]);
  return NextResponse.json(
    draftCheck({ team, enemy, me, opponent, wins: new Map(meta.map((m) => [m.hero, m.win])), against, alongside }),
  );
}
