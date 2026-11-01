import { NextResponse } from 'next/server';
import { loadMeta } from '@/lib/arena';
import { RANKS } from '@/lib/draft';

// Every hero strongest first at the player's rank. The page leaves out the
// ones already banned or picked, so it never has to ask again mid-draft.
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get('rank');
  const rank = RANKS.find((r) => r.key === asked)?.key ?? 'all';
  const meta = await loadMeta(rank).catch(() => null);
  return NextResponse.json(meta ?? [], {
    headers: { 'cache-control': meta ? 'public, max-age=3600' : 'no-store' },
  });
}
