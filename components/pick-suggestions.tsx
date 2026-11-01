'use client';

import { GameImage } from '@/components/game-image';
import { pickReason, type Ranked } from '@/lib/matchups';

type Props = {
  ranked: Ranked[];
  portraits: Record<string, string | null>;
  onPick: (hero: string) => void;
};

// The best few heroes for my lane as the board stands, from match data
// alone, so they show the moment a pick goes in. Tapping one makes it mine.
export function PickSuggestions({ ranked, portraits, onPick }: Props) {
  if (!ranked.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Best for your lane right now, tap to pick</p>
      <div className="flex flex-wrap gap-1.5">
        {ranked.map((r) => {
          const reason = pickReason(r);
          return (
            <button
              key={r.hero}
              type="button"
              aria-label={`Pick ${r.hero}`}
              onClick={() => onPick(r.hero)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-border py-0.5 ps-0.5 pe-3 text-sm hover:border-primary hover:bg-secondary"
            >
              {portraits[r.hero] ? (
                <GameImage src={portraits[r.hero]!} className="size-7 rounded-full" />
              ) : (
                <span className="ps-2" />
              )}
              <span>{r.hero}</span>
              {reason && <span className="text-xs text-muted-foreground">{reason}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
