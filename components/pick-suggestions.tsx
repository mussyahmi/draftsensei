'use client';

import { GameImage } from '@/components/game-image';
import { pickReason, type Ranked } from '@/lib/matchups';
import { useT } from '@/components/lang';

export const INSTANT_SHOWN = 3;

type Props = {
  // The best heroes for my lane from match data, strongest first; the first
  // few show, the rest back up any the AI picks from further down.
  ranked: Ranked[];
  // The AI's picks for this board, if asked. They take the chips' place, so
  // there is one list to choose from, never two.
  ai?: { hero: string; reason: string }[] | null;
  portraits: Record<string, string | null>;
  onPick: (hero: string) => void;
};

// The best few heroes for my lane as the board stands, shown the moment a
// pick goes in. Tapping one makes it mine.
export function PickSuggestions({ ranked, ai, portraits, onPick }: Props) {
  const t = useT();
  const instant = ranked.slice(0, INSTANT_SHOWN);
  const chips = ai?.length
    ? ai.map((a) => ({ hero: a.hero, note: a.reason, data: ranked.find((r) => r.hero === a.hero) }))
    : instant.map((r) => ({ hero: r.hero, note: '', data: r }));
  if (!chips.length) return null;
  return (
    <div className="space-y-2">
      {ai?.length ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          {t.aiChose}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t.bestForLane}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {chips.map(({ hero, note, data }) => {
          const reason = data ? pickReason(data, t.reasonWords) : null;
          const fresh = ai?.length && !instant.some((r) => r.hero === hero);
          return (
            <button
              key={hero}
              type="button"
              aria-label={t.pickHero(hero)}
              onClick={() => onPick(hero)}
              className="relative inline-flex min-h-9 items-center gap-1.5 rounded-2xl border border-dashed border-border py-0.5 ps-0.5 pe-3 text-start text-sm hover:border-primary hover:bg-secondary"
            >
              {fresh && (
                <span
                  aria-label={t.newPick}
                  className="absolute -top-0.5 end-1 size-2.5 rounded-full bg-primary ring-2 ring-background"
                />
              )}
              {portraits[hero] ? (
                <GameImage src={portraits[hero]!} className="size-7 shrink-0 rounded-full" />
              ) : (
                <span className="ps-2" />
              )}
              <span className="py-1">
                <span>{hero}</span>
                {reason && <span className="ms-1.5 text-xs text-muted-foreground">{reason}</span>}
                {note && <span className="block text-xs text-foreground/80">{note}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
