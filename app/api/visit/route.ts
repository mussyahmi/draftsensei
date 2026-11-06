import { NextResponse } from 'next/server';
import { countVisit, VISIT_PAGES, type VisitPage } from '@/lib/quota-store';

// One page open, for the owner's stats. Nothing comes back worth waiting for.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { page?: unknown } | null;
  const page = VISIT_PAGES.find((p) => p === body?.page) as VisitPage | undefined;
  if (!page) return NextResponse.json({ error: 'Unknown page.' }, { status: 400 });
  await countVisit(page);
  return new NextResponse(null, { status: 204 });
}
