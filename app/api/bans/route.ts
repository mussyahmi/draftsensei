import { NextResponse } from 'next/server';
import { withThreats } from '@/lib/bans';
import { loadGains, loadMeta } from '@/lib/arena';
import { RANKS } from '@/lib/draft';
import { HEROES } from '@/lib/heroes';

// More than any lane's list needs; each one is a request to the data source.
const MOST_MINE = 20;

// Every hero strongest first at the player's rank, with what beats the heroes
// they play moved up. The page leaves out the ones already banned or picked,
// so it never has to ask again mid-draft.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const asked = params.get('rank');
  const rank = RANKS.find((r) => r.key === asked)?.key ?? 'all';
  const mine = params.getAll('mine').filter((h) => HEROES.includes(h)).slice(0, MOST_MINE);
  const meta = await loadMeta(rank).catch(() => null);
  if (!meta) return NextResponse.json([], { headers: { 'cache-control': 'no-store' } });
  // One hero's counters failing costs that hero's threats, not the bans.
  const counters = (await Promise.allSettled(mine.map((h) => loadGains(h, 'counters', rank)))).flatMap((r, i) =>
    r.status === 'fulfilled' ? [[mine[i], r.value] as const] : [],
  );
  return NextResponse.json(withThreats(meta, counters), {
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}
