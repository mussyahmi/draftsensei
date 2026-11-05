'use client';

import { GameImage } from '@/components/game-image';
import { useT } from '@/components/lang';
import type { Likely } from '@/lib/likely';

type Props = {
  likely: Likely;
  // With no enemy pick yet every lane is open, which says nothing.
  showOpen: boolean;
  portraits: Record<string, string | null>;
};

// What the enemy may pick next. It only informs, so it stays quiet and takes
// no taps.
export function LikelyLine({ likely, showOpen, portraits }: Props) {
  const t = useT();
  if (!likely.heroes.length) return null;
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      {showOpen && <p>{t.enemyNeeds(likely.open.map((l) => l.toUpperCase()).join(', '))}</p>}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{t.enemyLikely}</span>
        {likely.heroes.map((hero) => (
          <span key={hero} className="inline-flex items-center gap-1 text-foreground/80">
            {portraits[hero] && <GameImage src={portraits[hero]!} className="size-5 rounded-full" />}
            {hero}
          </span>
        ))}
      </div>
    </div>
  );
}
