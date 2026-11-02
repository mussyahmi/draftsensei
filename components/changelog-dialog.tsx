'use client';

import type { Release } from '@/lib/changelog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/components/lang';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releases: Release[];
};

export function ChangelogDialog({ open, onOpenChange, releases }: Props) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.whatsNew}</DialogTitle>
          <DialogDescription>
            {t.youreOn(process.env.NEXT_PUBLIC_APP_VERSION ?? '')} {t.changelogNote}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {releases.map((r) => (
            <section key={r.version} className="space-y-2">
              <h3 className="font-display text-base">
                v{r.version}{' '}
                <span className="font-sans text-xs text-muted-foreground">{r.date}</span>
              </h3>
              {r.sections.map((s) => (
                <div key={s.heading}>
                  <h4 className="text-xs uppercase tracking-wide text-primary">{s.heading}</h4>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {s.items.map((item) => (
                      <li key={item} className="pl-4 -indent-4">
                        <span className="text-muted-foreground">• </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
