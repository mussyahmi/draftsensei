import { NextResponse } from 'next/server';
import { iconFor, loadBuilds, loadCatalog, loadCommunity } from '@/lib/arena';
import { fullBuild } from '@/lib/builds';
import { LANES, RANKS } from '@/lib/draft';

// The Academy's winning build for my hero and lane, with its icons, so the
// page can show it the moment the hero is chosen. No Gemini, so no wait and
// no ask spent.
const MIN_PICK_RATE = 0.05;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hero = params.get('hero')?.trim();
  const lane = LANES.find((l) => l.key === params.get('lane'))?.key;
  const rank = RANKS.find((r) => r.key === params.get('rank'))?.key ?? 'all';
  if (!hero || !lane) return NextResponse.json({ error: 'Need a hero and a lane.' }, { status: 400 });

  const [builds, catalog, community] = await Promise.all([
    loadBuilds(hero, lane, rank).catch(() => []),
    loadCatalog().catch(() => null),
    loadCommunity(hero).catch(() => []),
  ]);
  // A build few people play can top the win rates by luck, like a mage on an
  // assassin emblem. Only one that is played in a fair share of games shows
  // instantly; otherwise Suggest build is the answer.
  const winning = builds.find((b) => b.pickRate >= MIN_PICK_RATE);
  if (!winning) return NextResponse.json(null, { headers: { 'cache-control': 'no-store' } });
  // The Academy keeps three core items a build; the rest of the six come from
  // what players' own builds agree on.
  const build = { ...winning, items: fullBuild(winning.items, community) };

  const names = [build.spell, build.emblem, ...build.items].filter(Boolean);
  const icons = Object.fromEntries(names.map((n) => [n, catalog ? iconFor(catalog, n) : null]));
  // The server already keeps the Academy's answers for hours, so this is
  // quick either way. A browser keeping it would show an old or half-filled
  // build long after a better one is there.
  return NextResponse.json({ build, icons }, { headers: { 'cache-control': 'no-store' } });
}
