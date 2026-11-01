'use client';

import { X } from 'lucide-react';
import { LANES, laneLabel, poolFor, type Lane, type Pool } from '@/lib/draft';
import { GameImage } from '@/components/game-image';
import { HeroEntry } from '@/components/hero-entry';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pool: Pool;
  onChange: (pool: Pool) => void;
  portraits: Record<string, string | null>;
};

export function PoolDialog({ open, onOpenChange, pool, onChange, portraits }: Props) {
  const add = (lane: Lane, hero: string) => {
    if (poolFor(pool, lane).includes(hero)) return;
    onChange({ ...pool, [lane]: [...poolFor(pool, lane), hero] });
  };

  const drop = (lane: Lane, hero: string) => {
    onChange({ ...pool, [lane]: poolFor(pool, lane).filter((h) => h !== hero) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>My heroes</DialogTitle>
          <DialogDescription>
            The heroes you actually play. When the lane you&apos;re on has a list here,
            the answer only suggests from it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {LANES.map((lane) => (
            <div key={lane.key} className="space-y-2">
              <h3 className="font-display text-sm uppercase tracking-wide text-muted-foreground">
                {laneLabel(lane.key)}
              </h3>
              <HeroEntry
                onChoose={(hero) => add(lane.key, hero)}
                unavailable={poolFor(pool, lane.key)}
                portraits={portraits}
              />
              {poolFor(pool, lane.key).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {poolFor(pool, lane.key).map((hero) => (
                    <span
                      key={hero}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-0.5 ps-0.5 pe-1 text-sm"
                    >
                      {portraits[hero] && (
                        <GameImage src={portraits[hero]!} className="size-6 rounded-full" />
                      )}
                      <span className={portraits[hero] ? '' : 'ps-1.5'}>{hero}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${hero}`}
                        onClick={() => drop(lane.key, hero)}
                        // Padding makes a thumb-sized target around a small cross.
                        className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
