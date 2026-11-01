'use client';

import { X } from 'lucide-react';
import { GameImage } from '@/components/game-image';
import { HeroEntry } from '@/components/hero-entry';
import { banReason, suggestBans, type MetaHero } from '@/lib/bans';

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
  const suggested = bans.length < 10 ? suggestBans(meta, unavailable) : [];
  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
        Bans <span>{bans.length} / 10</span>
        <span className="ms-2 font-sans text-xs normal-case tracking-normal">optional</span>
      </h3>
      {bans.length < 10 && (
        <HeroEntry
          onChoose={(hero) => onChange([...bans, hero])}
          unavailable={unavailable}
          portraits={portraits}
          placeholder="Ban a hero…"
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
              <span className={portraits[hero] ? 'line-through decoration-1' : 'ps-1.5 line-through decoration-1'}>
                {hero}
              </span>
              <button
                type="button"
                aria-label={`Unban ${hero}`}
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
          <p className="text-xs text-muted-foreground">Strongest this week, tap to ban</p>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((m) => (
              <button
                key={m.hero}
                type="button"
                aria-label={`Ban ${m.hero}`}
                onClick={() => onChange([...bans, m.hero])}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-border py-0.5 ps-0.5 pe-3 text-sm hover:border-destructive hover:bg-secondary"
              >
                {portraits[m.hero] ? (
                  <GameImage src={portraits[m.hero]!} className="size-7 rounded-full" />
                ) : (
                  <span className="ps-2" />
                )}
                <span>{m.hero}</span>
                <span className="text-xs text-muted-foreground">{banReason(m)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
