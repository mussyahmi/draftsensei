'use client';

import { LANES, laneLabel, type Lane } from '@/lib/draft';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

type Props = {
  value: Lane;
  onChange: (lane: Lane) => void;
  className?: string;
};

export function LanePicker({ value, onChange, className }: Props) {
  return (
    <ToggleGroup
      // Base UI models the group's state as the list of pressed items, even
      // when only one of them can be pressed at a time.
      value={[value]}
      onValueChange={(lanes) => {
        const next = lanes[0] as Lane | undefined;
        if (next) onChange(next);
      }}
      spacing={1}
      className={cn(className)}
    >
      {LANES.map((lane) => (
        <ToggleGroupItem
          key={lane.key}
          value={lane.key}
          aria-label={laneLabel(lane.key)}
          title={laneLabel(lane.key)}
          className={cn(
            'h-10 flex-1 px-2.5 font-display text-xs uppercase tracking-wide aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:h-8 sm:flex-none',
          )}
        >
          {lane.key}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
