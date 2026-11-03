'use client';

import { useEffect, useState } from 'react';
import { PickSuggestions } from '@/components/pick-suggestions';
import { useT } from '@/components/lang';
import { LANES, type Lane } from '@/lib/draft';
import type { Picks, Ranked } from '@/lib/matchups';
import { cn } from '@/lib/utils';

type Props = {
  // The board as my own suggestions see it.
  board: Picks;
  // Mine, and any a teammate already took: nobody left there to help.
  closed: Lane[];
  portraits: Record<string, string | null>;
  onAdd: (hero: string, lane: Lane) => void;
};

// The best heroes for the lanes still open on my team, so I can tell a
// teammate what to pick. Nothing is asked for until a lane is tapped.
export function TeammatePicks({ board, closed, portraits, onAdd }: Props) {
  const t = useT();
  const [chosen, setChosen] = useState<Lane | null>(null);
  const [answer, setAnswer] = useState<{ asked: string; ranked: Ranked[] } | null>(null);
  const open = LANES.map((l) => l.key).filter((l) => !closed.includes(l));
  const lane = chosen && open.includes(chosen) ? chosen : null;
  // A teammate's list is theirs, so my own heroes do not limit it.
  const asked = lane ? JSON.stringify({ ...board, lane, pool: [] }) : '';

  useEffect(() => {
    if (!asked) return;
    let current = true;
    const timer = setTimeout(() => {
      fetch('/api/picks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ picks: JSON.parse(asked) }),
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((ranked: Ranked[]) => {
          if (current) setAnswer({ asked, ranked });
        })
        .catch(() => {
          /* no suggestions for this lane; typing a hero still works */
        });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [asked]);

  if (!open.length) return null;
  const ranked = answer?.asked === asked ? answer.ranked : [];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t.helpTeammate}</p>
      <div className="flex gap-1">
        {open.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={lane === key}
            aria-label={t.helpLane(key.toUpperCase())}
            // Tapped again it closes, so the page can go back to being short.
            onClick={() => setChosen(lane === key ? null : key)}
            className={cn(
              'min-h-9 flex-1 rounded-md px-1 font-display text-xs uppercase tracking-wide sm:flex-none sm:px-3',
              lane === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {key}
          </button>
        ))}
      </div>
      {lane && (
        <div className="pt-2">
          <PickSuggestions
            ranked={ranked}
            heading={t.teammateBest(lane.toUpperCase())}
            portraits={portraits}
            onPick={(hero) => onAdd(hero, lane)}
          />
        </div>
      )}
    </div>
  );
}
