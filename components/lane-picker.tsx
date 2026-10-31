'use client';

import { LANES, laneLabel, type Lane } from '@/lib/draft';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

type Props = {
  value: Lane;
  onChange: (lane: Lane) => void;
  size?: 'sm' | 'default';
  className?: string;
};

export function LanePicker({ value, onChange, size = 'default', className }: Props) {
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
            'font-display uppercase tracking-wide aria-pressed:bg-primary aria-pressed:text-primary-foreground',
            size === 'sm' ? 'h-6 min-w-6 px-1.5 text-[11px]' : 'h-8 px-2.5 text-xs',
          )}
        >
          {lane.key}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
