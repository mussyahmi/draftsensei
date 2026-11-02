import { NextResponse } from 'next/server';
import { iconFor, loadCatalog } from '@/lib/arena';
import { LANES, RANKS } from '@/lib/draft';
import { loadTopBuild } from '@/lib/top-build';

// The winning build for my hero and lane, with its icons, so the page can
// show it the moment the hero is chosen. No Gemini, so no wait and no ask
// spent.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hero = params.get('hero')?.trim();
  const lane = LANES.find((l) => l.key === params.get('lane'))?.key;
  const rank = RANKS.find((r) => r.key === params.get('rank'))?.key ?? 'all';
  if (!hero || !lane) return NextResponse.json({ error: 'Need a hero and a lane.' }, { status: 400 });

  const [build, catalog] = await Promise.all([
    loadTopBuild(hero, lane, rank),
    loadCatalog().catch(() => null),
  ]);
  if (!build) return NextResponse.json(null, { headers: { 'cache-control': 'no-store' } });

  const names = [build.spell, build.emblem, ...build.items].filter(Boolean);
  const icons = Object.fromEntries(names.map((n) => [n, catalog ? iconFor(catalog, n) : null]));
  // The server already keeps the Academy's answers for hours, so this is
  // quick either way. A browser keeping it would show an old or half-filled
  // build long after a better one is there.
  return NextResponse.json({ build, icons }, { headers: { 'cache-control': 'no-store' } });
}
