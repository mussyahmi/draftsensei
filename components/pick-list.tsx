'use client';

import { X } from 'lucide-react';
import { laneClashes, laneLabel, type Lane, type Pick } from '@/lib/draft';
import { LanePicker } from '@/components/lane-picker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  picks: Pick[];
  activeIndex: number | null;
  onLane: (index: number, lane: Lane) => void;
  onRemove: (index: number) => void;
  side: 'team' | 'enemy';
};

export function PickList({ picks, activeIndex, onLane, onRemove, side }: Props) {
  const clashes = laneClashes(picks);

  return (
    <div className="space-y-2">
      {clashes.length > 0 && (
        <p className="text-sm font-medium text-primary">
          Two heroes in {clashes.map(laneLabel).join(' and ')} — fix the lane.
        </p>
      )}

      {picks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No picks yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {picks.map((pick, i) => (
            <li
              key={`${pick.hero}-${i}`}
              className={cn(
                'flex items-center gap-2 rounded-md border bg-card/80 px-2 py-1.5',
                clashes.includes(pick.lane) ? 'border-primary' : 'border-border',
                activeIndex === i && 'ring-1 ring-primary',
              )}
            >
              <span
                className={cn(
                  'min-w-0 flex-1 truncate font-display text-base',
                  side === 'team' ? 'text-ally' : 'text-enemy',
                )}
              >
                {pick.hero}
              </span>
              <LanePicker
                value={pick.lane}
                onChange={(lane) => onLane(i, lane)}
                size="sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${pick.hero}`}
                title={`Remove ${pick.hero}`}
                onClick={() => onRemove(i)}
                className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
