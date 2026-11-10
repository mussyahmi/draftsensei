'use client';

import { GameImage } from '@/components/game-image';
import { Skeleton } from '@/components/ui/skeleton';
import { pickReason, type Ranked } from '@/lib/matchups';
import { tellingFills } from '@/lib/team-balance';
import { useT } from '@/components/lang';
import { cn } from '@/lib/utils';

// Three fill a phone's screen with one chip a row; a wider screen fits more.
const SHOWN_ON_PHONE = 3;
const SHOWN_WIDE = 5;

type Props = {
  // The best heroes for my lane from match data, strongest first; the first
  // few show, the rest back up any the AI picks from further down.
  ranked: Ranked[];
  // The AI's picks for this board, if asked. They take the chips' place, so
  // there is one list to choose from, never two.
  ai?: { hero: string; reason: string }[] | null;
  // Says who these are for, when not the player.
  heading?: string;
  // No answer has come yet: grey chips hold the place.
  waiting?: boolean;
  portraits: Record<string, string | null>;
  onPick: (hero: string) => void;
};

// The best few heroes for my lane as the board stands, shown the moment a
// pick goes in. Tapping one makes it mine.
export function PickSuggestions({ ranked, ai, heading, waiting, portraits, onPick }: Props) {
  const t = useT();
  const instant = ranked.slice(0, SHOWN_WIDE);
  const chips = ai?.length
    ? ai.map((a) => ({ hero: a.hero, note: a.reason, data: ranked.find((r) => r.hero === a.hero) }))
    : instant.map((r) => ({ hero: r.hero, note: '', data: r }));
  if (!chips.length && waiting) {
    return (
      <div role="status" aria-label={t.heroLoading} className="space-y-2">
        <p className="text-xs text-muted-foreground">{heading ?? t.bestForLane}</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: SHOWN_WIDE }, (_, i) => (
            <span
              key={i}
              className={cn(
                'min-h-9 items-center gap-1.5 rounded-2xl border border-dashed border-border py-0.5 ps-0.5 pe-3',
                i >= SHOWN_ON_PHONE ? 'hidden sm:inline-flex' : 'inline-flex',
              )}
            >
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (!chips.length) return null;
  const telling = tellingFills(chips.map((c) => c.data?.fills));
  return (
    <div className="space-y-2">
      {ai?.length ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          {t.aiChose}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{heading ?? t.bestForLane}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {chips.map(({ hero, note, data }, i) => {
          const reason = data ? pickReason(data, t.reasonWords) : null;
          // New means not on screen before, which depends on the screen.
          const at = ai?.length ? instant.findIndex((r) => r.hero === hero) : 0;
          const fresh = at < 0 || at >= SHOWN_ON_PHONE;
          return (
            <button
              key={hero}
              type="button"
              aria-label={t.pickHero(hero)}
              onClick={() => onPick(hero)}
              className={cn(
                'relative min-h-9 items-center gap-1.5 rounded-2xl border border-dashed border-border py-0.5 ps-0.5 pe-3 text-start text-sm hover:border-primary hover:bg-secondary',
                !ai?.length && i >= SHOWN_ON_PHONE ? 'hidden sm:inline-flex' : 'inline-flex',
              )}
            >
              {fresh && (
                <span
                  aria-label={t.newPick}
                  className={cn(
                    'absolute -top-0.5 end-1 size-2.5 rounded-full bg-primary ring-2 ring-background',
                    at >= 0 && 'sm:hidden',
                  )}
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
                {data?.fills?.filter((gap) => telling.has(gap)).map((gap) => (
                  <span key={gap} className="ms-1.5 text-xs text-primary">{t.fills[gap]}</span>
                ))}
                {note && <span className="block text-xs text-foreground/80">{note}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
