'use client';

import { GameImage } from '@/components/game-image';
import { useT } from '@/components/lang';
import { Skeleton } from '@/components/ui/skeleton';
import { WinRate } from '@/components/win-rate';
import { CLOSE, type LaneStrength } from '@/lib/best-lanes';
import type { Lane } from '@/lib/draft';
import { cn } from '@/lib/utils';

type Props = {
  // The numbers are still on their way: the card holds its place in grey.
  loading?: boolean;
  lanes: LaneStrength[];
  // The same, from My heroes only, when any are set.
  mine: LaneStrength[];
  selected: Lane | 'all';
  portraits: Record<string, string | null>;
  onLane: (lane: Lane) => void;
};

function Heroes({ s, portraits }: { s: LaneStrength; portraits: Record<string, string | null> }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {s.heroes.map((m) => (
        <span key={m.hero} className="inline-flex items-center gap-1 text-xs">
          {portraits[m.hero] && <GameImage src={portraits[m.hero]!} className="size-5 rounded-full" />}
          <span className="text-foreground/80">{m.hero}</span>
          <span className="tabular-nums text-muted-foreground">{(m.win * 100).toFixed(1)}%</span>
        </span>
      ))}
    </span>
  );
}

// For a solo player free to take any role: where the strong heroes are this
// week. Tapping a lane shows all its heroes below.
export function BestLanes({ loading, lanes, mine, selected, portraits, onLane }: Props) {
  const t = useT();
  if (loading) {
    return (
      <section role="status" aria-label={t.heroLoading} className="space-y-3 rounded-lg border border-border bg-card/40 p-3">
        <div>
          <h3 className="font-display text-sm uppercase tracking-wide">{t.bestLanesTitle}</h3>
          <p className="text-xs text-muted-foreground">{t.bestLanesHint}</p>
        </div>
        <ul className="space-y-1">
          {Array.from({ length: 5 }, (_, i) => (
            <li
              key={i}
              className="grid grid-cols-[3.75rem_1fr] items-center gap-2 px-2 py-1.5 sm:grid-cols-[4.5rem_4rem_1fr]"
            >
              <span className="flex flex-col gap-1.5 sm:contents">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-12" />
              </span>
              <span className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="hidden h-3 w-16 sm:block" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (!lanes.length) return null;
  const close = lanes.length > 1 && lanes[0].win - lanes[1].win < CLOSE;
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/40 p-3">
      <div>
        <h3 className="font-display text-sm uppercase tracking-wide">{t.bestLanesTitle}</h3>
        <p className="text-xs text-muted-foreground">{close ? t.bestLanesClose : t.bestLanesHint}</p>
      </div>
      {/* One lane a row: a ranked list reads top to bottom, never across. */}
      <ul className="space-y-1">
        {lanes.map((s) => (
          <li key={s.lane}>
            <button
              type="button"
              aria-pressed={selected === s.lane}
              onClick={() => onLane(s.lane)}
              className={cn(
                'grid w-full grid-cols-[3.75rem_1fr] items-center gap-2 rounded-md px-2 py-1.5 text-start hover:bg-secondary sm:grid-cols-[4.5rem_4rem_1fr]',
                selected === s.lane && 'bg-secondary',
              )}
            >
              {/* Lane over its number on a phone, side by side when wide. */}
              <span className="flex flex-col sm:contents">
                <span className="font-display text-xs uppercase tracking-wide">{s.lane}</span>
                <WinRate win={s.win} />
              </span>
              <Heroes s={s} portraits={portraits} />
            </button>
          </li>
        ))}
      </ul>
      {mine.length > 0 && (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {t.bestLaneMine(mine[0].lane.toUpperCase())}
          </p>
          <Heroes s={mine[0]} portraits={portraits} />
        </div>
      )}
    </section>
  );
}
