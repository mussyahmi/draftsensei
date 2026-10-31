'use client';

import { useRef, useState } from 'react';
import { HEROES } from '@/lib/heroes';
import { searchHeroes } from '@/lib/draft';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  onChoose: (hero: string) => void;
  unavailable: string[];
  placeholder?: string;
  /** Keys handled only when the box is empty — the 1–5 lane override. */
  onBareKey?: (key: string) => boolean;
  autoFocus?: boolean;
  className?: string;
};

const MAX = 6;

export function HeroEntry({
  onChoose,
  unavailable,
  placeholder = 'Type a hero…',
  onBareKey,
  autoFocus,
  className,
}: Props) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLElement>(null);

  const matches = query ? searchHeroes(query, HEROES, unavailable).slice(0, MAX) : [];

  const choose = (hero: string) => {
    setQuery('');
    setCursor(0);
    onChoose(hero);
    input.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={input}
        value={query}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        onValueChange={(next) => {
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
          if (e.key === 'Escape') {
            setQuery('');
            return;
          }
          if (!query && onBareKey?.(e.key)) e.preventDefault();
        }}
        className="h-10 bg-background/60 font-medium"
      />

      {matches.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-xl">
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
                  'block w-full px-3 py-1.5 text-left text-sm',
                  i === cursor ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                {hero}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
