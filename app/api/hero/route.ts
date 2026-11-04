import { NextResponse } from 'next/server';
import { loadGains } from '@/lib/arena';
import { RANKS } from '@/lib/draft';
import { heroDetail } from '@/lib/hero-detail';
import { HEROES } from '@/lib/heroes';

// One hero's counters and teammates at a rank, from match data alone.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hero = params.get('hero') ?? '';
  if (!HEROES.includes(hero)) return NextResponse.json({ error: 'No such hero.' }, { status: 400 });
  const rank = RANKS.find((r) => r.key === params.get('rank'))?.key ?? 'all';
  const [against, alongside] = await Promise.all([
    loadGains(hero, 'counters', rank).catch(() => null),
    loadGains(hero, 'teammates', rank).catch(() => null),
  ]);
  if (!against && !alongside) return NextResponse.json(null, { headers: { 'cache-control': 'no-store' } });
  return NextResponse.json(heroDetail(hero, against ?? new Map(), alongside ?? new Map()), {
    headers: { 'cache-control': against && alongside ? 'public, max-age=3600' : 'no-store' },
  });
}
