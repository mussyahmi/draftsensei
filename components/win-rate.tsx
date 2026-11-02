import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// A hero's win rate at the player's rank this week. Winning more than losing
// is green with an arrow up, so it reads without telling colours apart.
export function WinRate({ win, plain, className }: { win: number; plain?: boolean; className?: string }) {
  const good = win >= 0.5;
  const Arrow = good ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        !plain && (good ? 'text-emerald-400' : 'text-red-400'),
        className,
      )}
    >
      <Arrow className="size-3" />
      {(win * 100).toFixed(1)}%
    </span>
  );
}
