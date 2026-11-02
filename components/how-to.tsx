'use client';

import { useT } from '@/components/lang';

// Three steps for a first visit, shown only while the draft is empty: once
// a hero is in, the page explains itself and this would be in the way.
export function HowTo() {
  const t = useT();
  return (
    <div className="space-y-3 rounded-md bg-card/80 p-4">
      {/* What it is for comes first: the steps make sense once you know. */}
      <p className="font-medium">{t.purpose}</p>
      <ol className="space-y-2">
        {t.howTo.map((step, i) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm text-primary-foreground">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      {/* The game is on the phone in your hand, so this goes on another
          screen beside it. */}
      <p className="text-xs text-muted-foreground">{t.howToTip}</p>
    </div>
  );
}
