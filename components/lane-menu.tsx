'use client';

import { ChevronDown } from 'lucide-react';
import { LANES, type Lane } from '@/lib/draft';
import { useT } from '@/components/lang';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// A pick's lane as one chip, with the others a tap away. The lane is filled
// in for you and usually right, so the other four do not need to be on screen.
export function LaneMenu({
  value,
  warn,
  taken = {},
  onChange,
}: {
  value: Lane;
  warn?: boolean;
  // Who else is in each lane, so it shows which are free before choosing.
  taken?: Partial<Record<Lane, string>>;
  onChange: (lane: Lane) => void;
}) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.laneMenu(value.toUpperCase())}
        // Quiet until something is off with this lane, then it is what to fix.
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-secondary ps-2.5 pe-1.5 font-display text-xs uppercase tracking-wide text-secondary-foreground sm:h-7',
          warn && 'text-primary ring-1 ring-inset ring-primary',
        )}
      >
        {value}
        <ChevronDown className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuRadioGroup value={value} onValueChange={(lane) => onChange(lane as Lane)}>
          {LANES.map((lane) => (
            // Closes on choosing, and says each lane just as the chip will.
            <DropdownMenuRadioItem
              key={lane.key}
              value={lane.key}
              closeOnClick
              className="min-h-10 font-display text-sm uppercase tracking-wide sm:min-h-8"
            >
              {lane.key}
              {taken[lane.key] && (
                <span className="ms-auto ps-4 pe-5 font-sans text-xs normal-case tracking-normal text-muted-foreground">
                  {taken[lane.key]}
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
