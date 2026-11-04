'use client';

import { useState } from 'react';
import { CircleHelp, X } from 'lucide-react';
import { useT } from '@/components/lang';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { loadHowToHidden, saveHowToHidden } from '@/lib/storage';

function Steps() {
  const t = useT();
  return (
    <>
      <ol className="space-y-2">
        {t.howTo.map((step, i) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm text-secondary-foreground">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      {/* The game is on the phone in your hand, so this goes on another
          screen beside it. */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{t.howToTip}</p>
        <p>{t.howToHeroes}</p>
      </div>
    </>
  );
}

// Three steps for a first visit, shown only while the draft is empty: once
// a hero is in, the page explains itself and this would be in the way. Regular
// players can put it away for good, with the header's help button to reach it;
// it is only drawn after the page has loaded from storage, so reading the
// choice here cannot differ from the server.
export function HowTo() {
  const t = useT();
  const [hidden, setHidden] = useState(loadHowToHidden);
  if (hidden) return null;
  return (
    <div className="space-y-3 rounded-md bg-card/80 p-4">
      {/* What it is for comes first: the steps make sense once you know. */}
      <div className="flex items-start gap-2">
        <p className="flex-1 font-medium">{t.purpose}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t.howToHide}
          title={t.howToHide}
          onClick={() => {
            setHidden(true);
            saveHowToHidden(true);
          }}
          className="-me-2 -mt-2 size-9 shrink-0 text-muted-foreground sm:size-7"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <Steps />
    </div>
  );
}

// The same steps from anywhere, mid-draft included, over the page so nothing
// on it moves.
export function HowToButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t.howToShow}
        title={t.howToShow}
        onClick={() => setOpen(true)}
        className="size-9 shrink-0 text-muted-foreground hover:text-foreground sm:size-8"
      >
        <CircleHelp className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.howToShow}</DialogTitle>
            <DialogDescription>{t.purpose}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Steps />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
