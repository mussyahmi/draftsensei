import { NextResponse } from 'next/server';
import { DAILY_LIMIT } from '@/lib/quota';
import { asksToday } from '@/lib/quota-store';

// How much of today's shared allowance is gone, for the header.
export async function GET() {
  const used = await asksToday();
  return NextResponse.json(
    { used, limit: DAILY_LIMIT },
    { headers: { 'cache-control': 'no-store' } },
  );
}
