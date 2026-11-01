import { NextResponse } from 'next/server';
import { loadPortraits } from '@/lib/arena';

// Every hero's portrait by name, fetched once per visit: about 130 small URLs.
export async function GET() {
  const portraits = await loadPortraits().catch(() => null);
  return NextResponse.json(portraits ?? {}, {
    headers: { 'cache-control': portraits ? 'public, max-age=86400' : 'no-store' },
  });
}
