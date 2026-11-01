import { NextResponse } from 'next/server';
import { iconFor, loadCatalog } from '@/lib/arena';

// A build names at most six items and a spell; anything past a dozen is not
// coming from the app.
const MAX_NAMES = 12;

export async function GET(request: Request) {
  const names = [...new Set(new URL(request.url).searchParams.getAll('n').map((n) => n.trim()))]
    .filter(Boolean)
    .slice(0, MAX_NAMES);
  if (!names.length) {
    return NextResponse.json({ error: 'No item names.' }, { status: 400 });
  }

  const catalog = await loadCatalog().catch(() => null);
  // No icons is a fine build; the names are still there to read.
  const icons = Object.fromEntries(
    names.map((n) => [n, catalog ? iconFor(catalog, n) : null]),
  );

  return NextResponse.json(icons, {
    headers: { 'cache-control': catalog ? 'public, max-age=86400' : 'no-store' },
  });
}
