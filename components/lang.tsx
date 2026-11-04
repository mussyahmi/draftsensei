'use client';

import { createContext, useContext } from 'react';
import { LANGS, STRINGS, type Lang, type Strings } from '@/lib/i18n';
import { chipOn, cn } from '@/lib/utils';

const LangContext = createContext<Strings>(STRINGS.en);

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={STRINGS[lang]}>{children}</LangContext.Provider>;
}

/** The words for the page's current language. */
export const useT = () => useContext(LangContext);

// EN | BM, both always visible so switching is one tap and it is clear which
// is on.
export function LangToggle({ value, onChange }: { value: Lang; onChange: (lang: Lang) => void }) {
  const t = useT();
  return (
    <div role="group" aria-label={t.language} className="flex shrink-0 rounded-md border border-border p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          lang={l.key}
          aria-pressed={value === l.key}
          title={l.name}
          onClick={() => onChange(l.key)}
          className={cn(
            'h-8 min-w-9 rounded px-2 font-display text-xs tracking-wide sm:h-7',
            value === l.key ? chipOn : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
