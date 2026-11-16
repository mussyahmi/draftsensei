'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useT } from '@/components/lang';
import { patchChange, type Patch } from '@/lib/patch';
import { cn } from '@/lib/utils';

// A small mark after a hero's name when the current patch changed it: up for a
// buff, down for a nerf, a dot for anything else. Nothing for the rest.
export function PatchMark({ hero, patch, className }: { hero: string; patch?: Patch; className?: string }) {
  const t = useT();
  const change = patchChange(hero, patch);
  if (!change) return null;
  const label =
    change.change === 'buff' ? t.patchBuff : change.change === 'nerf' ? t.patchNerf : t.patchAdjust;
  return (
    <span role="img" aria-label={label} title={label} className={cn('inline-flex shrink-0 items-center', className)}>
      {change.change === 'buff' && <ArrowUp className="size-3.5 text-emerald-400" />}
      {change.change === 'nerf' && <ArrowDown className="size-3.5 text-red-400" />}
      {change.change === 'adjust' && <span className="size-1.5 rounded-full bg-primary" />}
    </span>
  );
}
