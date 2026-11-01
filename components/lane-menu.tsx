'use client';

import { ChevronDown } from 'lucide-react';
import { LANES, laneLabel, type Lane } from '@/lib/draft';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// A pick's lane as one chip, with the others a tap away. The lane is filled
// in for you and usually right, so the other four do not need to be on screen.
export function LaneMenu({ value, onChange }: { value: Lane; onChange: (lane: Lane) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Lane: ${laneLabel(value)}. Change lane`}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-primary ps-2.5 pe-1.5 font-display text-xs uppercase tracking-wide text-primary-foreground sm:h-7"
      >
        {value}
        <ChevronDown className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
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
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
