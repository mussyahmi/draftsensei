'use client';

import { X } from 'lucide-react';
import { GameImage } from '@/components/game-image';
import { HeroEntry } from '@/components/hero-entry';
import { banReason, suggestBans, type MetaHero } from '@/lib/bans';
import { useT } from '@/components/lang';
import { cn } from '@/lib/utils';

type Props = {
  bans: string[];
  // Heroes already picked or banned, which cannot be banned again.
  unavailable: string[];
  portraits: Record<string, string | null>;
  // Every hero strongest first at the player's rank; empty if not loaded.
  meta: MetaHero[];
  onChange: (bans: string[]) => void;
};

// Both teams' bans in one list: entering them is optional, and when it is
// done, suggestions skip them. Ten at most, five a side.
export function BanList({ bans, unavailable, portraits, meta, onChange }: Props) {
  const t = useT();
  const full = bans.length >= 10;
  const suggested = full ? [] : suggestBans(meta, unavailable);
  return (
    <div className="space-y-2">
      {bans.length < 10 && (
        <HeroEntry
          onChoose={(hero) => onChange([...bans, hero])}
          unavailable={unavailable}
          portraits={portraits}
          placeholder={t.banHero}
        />
      )}
      {bans.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bans.map((hero) => (
            <span
              key={hero}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-0.5 ps-0.5 pe-1 text-sm"
            >
              {portraits[hero] && (
                <GameImage src={portraits[hero]!} className="size-6 rounded-full grayscale" />
              )}
              {/* All ten in: on a phone the faces alone, so the finished
                  bans take one line and the picks move up. */}
              <span
                className={cn(
                  'line-through decoration-1',
                  !portraits[hero] && 'ps-1.5',
                  full && portraits[hero] && 'hidden sm:inline',
                )}
              >
                {hero}
              </span>
              <button
                type="button"
                aria-label={t.unban(hero)}
                onClick={() => onChange(bans.filter((b) => b !== hero))}
                className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* No asking needed: the strongest heroes this week, one tap each. */}
      {suggested.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">{t.strongest}</p>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((m) => (
              <button
                key={m.hero}
                type="button"
                aria-label={t.ban(m.hero)}
                onClick={() => onChange([...bans, m.hero])}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-border py-0.5 ps-0.5 pe-3 text-sm hover:border-destructive hover:bg-secondary"
              >
                {portraits[m.hero] ? (
                  <GameImage src={portraits[m.hero]!} className="size-7 rounded-full" />
                ) : (
                  <span className="ps-2" />
                )}
                <span>{m.hero}</span>
                {/* On a phone the win rate alone, so two or three fit a line. */}
                <span className="text-xs text-muted-foreground sm:hidden">{t.banShort(Math.round(m.win * 100))}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{banReason(m, t.banReason)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
