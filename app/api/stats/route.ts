import { NextResponse } from 'next/server';
import { isOwner } from '@/lib/owner';
import { DAILY_LIMIT } from '@/lib/quota';
import { recentUsage } from '@/lib/quota-store';

const DAYS = 14;

// Visits and asks for the last two weeks, for the owner only.
export async function GET(request: Request) {
  if (!(await isOwner(request))) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }
  try {
    const days = await recentUsage(DAYS);
    return NextResponse.json({ days, limit: DAILY_LIMIT }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Stats unavailable.' }, { status: 503 });
  }
}
