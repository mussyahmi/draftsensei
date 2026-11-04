'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HEROES } from '@/lib/heroes';
import { heroListPlace, searchHeroes } from '@/lib/draft';
import { GameImage } from '@/components/game-image';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useT } from '@/components/lang';
import { WinRate } from '@/components/win-rate';

type Props = {
  onChoose: (hero: string) => void;
  unavailable: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  // Portraits by hero name, shown beside each match.
  portraits?: Record<string, string | null>;
  // Win rates by hero name at the player's rank, shown beside each match.
  wins?: Record<string, number>;
};

const MAX = 6;

export function HeroEntry({
  onChoose,
  unavailable,
  placeholder,
  autoFocus,
  className,
  portraits = {},
  wins,
}: Props) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLElement>(null);

  const [place, setPlace] = useState({ up: false, maxHeight: 0 });
  const rows = useRef(0);

  // On a phone the keyboard covers the lower half of the page, and a list
  // opening under a low box would sit behind it. The visual viewport is the
  // part still showing; inside a dialog, the dialog's edges clip the list too.
  const measure = useCallback(() => {
    const box = input.current?.getBoundingClientRect();
    if (!box) return;
    const view = window.visualViewport;
    const frame = input.current?.closest('[role="dialog"]')?.getBoundingClientRect();
    const top = Math.max(view?.offsetTop ?? 0, frame?.top ?? 0);
    const bottom = Math.min(
      (view?.offsetTop ?? 0) + (view?.height ?? window.innerHeight),
      frame?.bottom ?? Infinity,
    );
    setPlace(heroListPlace(rows.current, bottom - box.bottom, box.top - top));
  }, []);

  // The keyboard finishes opening after the box has focus.
  useEffect(() => {
    const view = window.visualViewport;
    view?.addEventListener('resize', measure);
    view?.addEventListener('scroll', measure);
    return () => {
      view?.removeEventListener('resize', measure);
      view?.removeEventListener('scroll', measure);
    };
  }, [measure]);

  const matches = query ? searchHeroes(query, HEROES, unavailable).slice(0, MAX) : [];

  const choose = (hero: string) => {
    setQuery('');
    setCursor(0);
    onChoose(hero);
    // With a keyboard and mouse, the next name can be typed straight away. On a
    // phone that would hold the on-screen keyboard over what the pick just changed.
    if (window.matchMedia('(pointer: fine)').matches) input.current?.focus();
    else input.current?.blur();
  };

  // Focus is a head start with a keyboard and mouse. On a phone it pops the
  // on-screen keyboard over half the page before anything has been read.
  useEffect(() => {
    if (autoFocus && window.matchMedia('(pointer: fine)').matches) input.current?.focus();
  }, [autoFocus]);

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={input}
        value={query}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder ?? t.typeHero}
        onFocus={measure}
        onValueChange={(next) => {
          rows.current = Math.min(searchHeroes(next, HEROES, unavailable).length, MAX);
          measure();
          setQuery(next);
          setCursor(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (!matches.length) return;
            e.preventDefault();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setCursor((c) => (c + step + matches.length) % matches.length);
            return;
          }
          if (e.key === 'Enter' && matches.length) {
            e.preventDefault();
            choose(matches[cursor]);
            return;
          }
          if (e.key === 'Escape') setQuery('');
        }}
        className="h-10 bg-background/60 font-medium"
      />

      {matches.length > 0 && (
        <ul
          style={{ maxHeight: place.maxHeight || undefined }}
          className={cn(
            'absolute z-30 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-xl',
            place.up ? 'bottom-full mb-1' : 'mt-1',
          )}
        >
          {matches.map((hero, i) => (
            <li key={hero}>
              <button
                type="button"
                // mousedown, because blur would otherwise close the list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(hero);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm sm:py-1',
                  i === cursor ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                {portraits[hero] ? (
                  <GameImage src={portraits[hero]!} className="size-7 rounded-full" />
                ) : (
                  <span className="size-7 shrink-0 rounded-full bg-muted" />
                )}
                {hero}
                {wins?.[hero] != null && (
                  <WinRate win={wins[hero]} plain={i === cursor} className="ms-auto" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
