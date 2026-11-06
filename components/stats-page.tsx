'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { idToken, signInWithGoogle, watchAccount, type Account } from '@/lib/cloud';
import { firebaseReady } from '@/lib/firebase';
import { malaysiaTime, nextReset } from '@/lib/quota';
import type { DayUsage } from '@/lib/quota-store';

// `reset` is when today's count starts over, in Malaysia time.
type Stats = { days: DayUsage[]; limit: number; reset: string };
type State = 'loading' | 'signed-out' | 'not-owner' | 'failed' | Stats;

const visitsOf = (d: DayUsage) => d.visits.draft + d.visits.heroes;

// "Wed 5 Nov" from a quota day, read as a calendar date so no time zone moves it.
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

// For whoever runs the app: how many open it, and how much of the shared AI
// allowance is gone. Only for the owner's account; English only.
export function StatsPage() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [state, setState] = useState<State>('loading');

  useEffect(() => watchAccount(setAccount), []);

  useEffect(() => {
    if (account === undefined) return;
    let current = true;
    const set = (next: State) => current && setState(next);
    if (!account) {
      set('signed-out');
    } else {
      set('loading');
      idToken()
        .then((token) => fetch('/api/stats', { headers: { authorization: `Bearer ${token}` } }))
        .then(async (r) => {
          if (r.status === 403) return set('not-owner');
          if (!r.ok) return set('failed');
          // Midnight in California, which moves an hour in Malaysia when US clocks change.
          set({ ...((await r.json()) as Omit<Stats, 'reset'>), reset: malaysiaTime(nextReset()) });
        })
        .catch(() => set('failed'));
    }
    return () => {
      current = false;
    };
  }, [account]);

  const today = typeof state === 'object' ? state.days[0] : null;
  const reset = typeof state === 'object' ? state.reset : '';
  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-xl uppercase tracking-wider">Stats</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to draft
        </Link>
      </div>

      {state === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
      {state === 'signed-out' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Sign in with the owner&apos;s Google account to see the stats.</p>
          {firebaseReady && <Button onClick={() => void signInWithGoogle().catch(() => {})}>Sign in</Button>}
        </div>
      )}
      {state === 'not-owner' && (
        <p className="text-sm text-muted-foreground">This account cannot see the stats.</p>
      )}
      {state === 'failed' && (
        <p className="text-sm text-muted-foreground">The stats did not load. Try again in a moment.</p>
      )}

      {typeof state === 'object' && today && (
        <>
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <p className="text-xs text-muted-foreground">Visits today</p>
              <p className="font-display text-3xl tabular-nums">{visitsOf(today)}</p>
              <p className="text-xs text-muted-foreground">
                {today.visits.draft} draft · {today.visits.heroes} heroes
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <p className="text-xs text-muted-foreground">AI asks today</p>
              <p className="font-display text-3xl tabular-nums">
                {today.asks}
                <span className="text-base text-muted-foreground"> / {state.limit}</span>
              </p>
              <p className="text-xs text-muted-foreground">Resets at {reset} Malaysia time</p>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs text-muted-foreground">Last 14 days</h2>
            <div className="rounded-lg border border-border">
              <div className="grid grid-cols-[1fr_repeat(3,4rem)] gap-2 px-3 py-2 text-xs text-muted-foreground">
                <span>Day</span>
                <span className="text-end">Draft</span>
                <span className="text-end">Heroes</span>
                <span className="text-end">Asks</span>
              </div>
              <ul>
                {state.days.map((d) => (
                  <li
                    key={d.day}
                    className="grid grid-cols-[1fr_repeat(3,4rem)] gap-2 border-t border-border px-3 py-2 text-sm tabular-nums"
                  >
                    <span>{dayLabel(d.day)}</span>
                    <span className="text-end">{d.visits.draft}</span>
                    <span className="text-end">{d.visits.heroes}</span>
                    <span className="text-end">{d.asks}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Visits are page opens, not people: a refresh counts again. Each day runs from {reset} Malaysia time
              to {reset} the next day, the same as the AI allowance, so it is named by the date it starts on.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
