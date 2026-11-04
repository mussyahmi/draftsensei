'use client';

import { GameImage } from '@/components/game-image';
import { useT } from '@/components/lang';
import { cn } from '@/lib/utils';
import type { Build } from '@/lib/builds';

export type TopBuild = { build: Build; icons: Record<string, string | null> };

function Piece({ name, icon, note }: { name: string; icon: string | null | undefined; note?: string }) {
  return (
    <li className="flex items-center gap-2">
      {icon ? (
        <GameImage src={icon} className="size-8 shrink-0" />
      ) : (
        <span className="size-8 shrink-0 rounded-md bg-muted" />
      )}
      <span className="text-sm leading-tight">
        {name}
        {note && <span className="block text-xs text-muted-foreground">{note}</span>}
      </span>
    </li>
  );
}

// The build that wins most for my hero in my lane, straight from ranked
// games, shown as soon as the hero is known. Gemini's answer below fills in
// the rest of the items for this enemy team.
export function InstantBuild({ top, wide }: { top: TopBuild; wide?: boolean }) {
  const t = useT();
  const { build, icons } = top;
  return (
    <div className={cn('space-y-2 rounded-md bg-card/80 p-3', !wide && 'max-w-lg')}>
      <p className="text-xs text-muted-foreground">{t.topBuild(Math.round(build.winRate * 100))}</p>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {build.spell && <Piece name={build.spell} icon={icons[build.spell]} />}
        {build.emblem && (
          <Piece name={build.emblem} icon={icons[build.emblem]} note={build.talents.join(', ')} />
        )}
      </ul>
      {build.items.length > 0 && (
        <>
          <p className="pt-1 text-xs text-muted-foreground">{t.buildItems}</p>
          <ol className="grid grid-cols-6 gap-2">
            {build.items.map((item) => (
              <li key={item} className="flex flex-col items-center gap-1 text-center">
                {icons[item] ? (
                  <GameImage src={icons[item]!} className="size-10 sm:size-12" />
                ) : (
                  <span className="size-10 rounded-md bg-muted sm:size-12" />
                )}
                <span className="text-xs leading-tight">{item}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
