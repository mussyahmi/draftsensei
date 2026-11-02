'use client';

import { ChevronDown } from 'lucide-react';
import { RANKS, type Lane, type Rank } from '@/lib/draft';
import { LanePicker } from '@/components/lane-picker';
import { useT } from '@/components/lang';

type Props = {
  lane: Lane;
  rank: Rank;
  onLane: (lane: Lane) => void;
  onRank: (rank: Rank) => void;
};

// Who is playing: set once and remembered, but on the page rather than in a
// header or a popup, so the first step is the first thing you see.
export function YouCard({ lane, rank, onLane, onRank }: Props) {
  const t = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_auto] sm:justify-start sm:gap-8">
      <div className="space-y-2">
        <h3 className="font-display text-sm uppercase tracking-widest text-primary">{t.playing}</h3>
        <LanePicker value={lane} onChange={onLane} className="w-full sm:w-auto" />
      </div>
      {/* Stats from players at your level fit you better than all ranks mixed. */}
      <label className="block space-y-2">
        <span className="block font-display text-sm uppercase tracking-widest text-primary">{t.myRank}</span>
        {/* The browser's own arrow sits hard against the edge and matches
            nothing else here, so it is swapped for the app's chevron. */}
        <span className="relative block sm:inline-block">
          <select
            value={rank}
            onChange={(e) => onRank(e.target.value as Rank)}
            className="h-10 w-full appearance-none rounded-lg border border-input bg-background/60 ps-3 pe-9 text-base sm:h-8 sm:w-auto sm:text-sm"
          >
            {RANKS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.key === 'all' ? t.allRanks : r.key === 'glory' ? t.gloryUp : r.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </span>
      </label>
    </div>
  );
}
