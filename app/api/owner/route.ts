import { NextResponse } from 'next/server';
import { isOwner } from '@/lib/owner';

// Whether the signed-in account runs the app, so its menu can offer Stats.
export async function GET(request: Request) {
  return NextResponse.json(
    { owner: await isOwner(request) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
