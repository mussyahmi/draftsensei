'use client';

import { X } from 'lucide-react';
import { laneClashes, type Lane, type Pick } from '@/lib/draft';
import { offLane } from '@/lib/team-balance';
import { GameImage } from '@/components/game-image';
import { LaneMenu } from '@/components/lane-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '@/components/lang';

type Props = {
  picks: Pick[];
  onLane: (index: number, lane: Lane) => void;
  onRemove: (index: number) => void;
  side: 'team' | 'enemy';
  portraits: Record<string, string | null>;
  // The hero I said I am playing, shown last on my team. Its lane is set in
  // the header, so here it can only be cleared.
  me?: { hero: string; lane: Lane };
  onClearMe?: () => void;
};

type Row = { hero: string; lane: Lane; me: boolean; onLane?: (lane: Lane) => void; onRemove?: () => void };

export function PickList({ picks, onLane, onRemove, side, portraits, me, onClearMe }: Props) {
  const rows: Row[] = [
    ...picks.map((p, i) => ({
      hero: p.hero,
      lane: p.lane,
      // My hero may be one I already typed in as a teammate; tag that row
      // rather than show the hero twice.
      me: p.hero === me?.hero,
      onLane: (lane: Lane) => onLane(i, lane),
      // Removing my own hero here clears it as mine too, or it would come
      // straight back as its own row.
      onRemove: () => {
        onRemove(i);
        if (p.hero === me?.hero) onClearMe?.();
      },
    })),
    ...(me && !picks.some((p) => p.hero === me.hero) ? [{ ...me, me: true, onRemove: onClearMe }] : []),
  ];
  const t = useT();
  // My own hero counts: two of us in one lane is as wrong as two teammates.
  const clashes = laneClashes(rows);
  // Only my own team's lanes are mine to fix.
  const astray = side === 'team' ? offLane(rows).map((o) => o.hero) : [];
  // Everyone else's lane, as this row's menu should show it.
  const takenFor = (hero: string) => {
    const taken: Partial<Record<Lane, string>> = {};
    for (const r of rows) {
      if (r.hero === hero) continue;
      const name = r.me ? `${r.hero} (${t.you})` : r.hero;
      taken[r.lane] = taken[r.lane] ? `${taken[r.lane]}, ${name}` : name;
    }
    return taken;
  };

  return (
    <div className="space-y-2">
      {clashes.length > 0 && (
        <p className="text-sm font-medium text-primary">
          {t.clash(clashes.map((l) => l.toUpperCase()))}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noPicks}</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((pick, i) => (
            <li
              key={`${pick.hero}-${i}`}
              className={cn(
                'flex items-center gap-2 rounded-md border bg-card/80 px-2 py-1.5',
                clashes.includes(pick.lane) ? 'border-primary' : 'border-border',
              )}
            >
              {portraits[pick.hero] && (
                <GameImage src={portraits[pick.hero]!} className="size-8 rounded-full" />
              )}
              <span
                className={cn(
                  'min-w-0 flex-1 truncate font-display text-base',
                  side === 'team' ? 'text-ally' : 'text-enemy',
                )}
              >
                {pick.hero}
                {pick.me && (
                  <span className="ms-1.5 rounded bg-primary/15 px-1.5 py-0.5 align-middle font-sans text-xs font-semibold uppercase text-primary">
                    {t.you}
                  </span>
                )}
              </span>
              {pick.onLane ? (
                <LaneMenu
                  value={pick.lane}
                  warn={clashes.includes(pick.lane) || astray.includes(pick.hero)}
                  taken={takenFor(pick.hero)}
                  onChange={pick.onLane}
                />
              ) : (
                <span className="inline-flex h-9 items-center rounded-md bg-secondary px-2.5 font-display text-xs uppercase tracking-wide text-secondary-foreground sm:h-7">
                  {pick.lane}
                </span>
              )}
              {pick.onRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t.remove(pick.hero)}
                  title={t.remove(pick.hero)}
                  onClick={pick.onRemove}
                  className="size-9 shrink-0 text-muted-foreground hover:text-destructive sm:size-6"
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
