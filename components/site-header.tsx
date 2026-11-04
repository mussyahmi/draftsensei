'use client';

import type { ReactNode } from 'react';
import { HowToButton } from '@/components/how-to';
import { LangToggle, useT } from '@/components/lang';
import type { Lang } from '@/lib/i18n';

type Props = {
  lang: Lang;
  onLang: (lang: Lang) => void;
  // Where the changelog is on hand, the version opens it.
  onVersion?: () => void;
  // A short note between the name and the links.
  note?: ReactNode;
  // The links for this page.
  children: ReactNode;
};

// The same bar on every page, so moving between them does not move anything.
// It sits inside the page's LangProvider.
export function SiteHeader({ lang, onLang, onVersion, note, children }: Props) {
  const t = useT();
  const version = `v${process.env.NEXT_PUBLIC_APP_VERSION}`;
  return (
    <header className="border-b border-border bg-card/60">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex w-full items-center gap-1.5 sm:w-auto sm:gap-3">
          <div className="flex items-baseline gap-1.5">
            <h1 className="font-display text-xl uppercase tracking-wider">DraftSensei</h1>
            {onVersion ? (
              <button
                type="button"
                onClick={onVersion}
                title={t.whatsNew}
                className="-my-2 py-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {version}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">{version}</span>
            )}
          </div>
          {/* Beside the languages on both layouts: help before them where the
              phone has the space, after them on a wide bar. */}
          <div className="ms-auto flex items-center gap-1 sm:ms-0 sm:flex-row-reverse">
            <HowToButton />
            <LangToggle value={lang} onChange={onLang} />
          </div>
        </div>
        {note}
        <div className="ms-auto flex flex-wrap items-center justify-end gap-1">{children}</div>
      </div>
    </header>
  );
}
