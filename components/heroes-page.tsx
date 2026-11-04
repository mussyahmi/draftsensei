'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { GameImage } from '@/components/game-image';
import { InstantBuild, type TopBuild } from '@/components/instant-build';
import { AccountButton } from '@/components/account-button';
import { LangProvider } from '@/components/lang';
import { SiteHeader } from '@/components/site-header';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WinRate } from '@/components/win-rate';
import type { MetaHero } from '@/lib/bans';
import { LANES, newPool, RANKS, searchHeroes, type Lane, type Pool, type Rank } from '@/lib/draft';
import type { HeroDetail, HeroEdge } from '@/lib/hero-detail';
import { HERO_LANES, HERO_OTHER_LANES, HEROES, playsLane } from '@/lib/heroes';
import { signInWithGoogle, signOutOfGoogle, watchAccount, type Account } from '@/lib/cloud';
import { firebaseReady } from '@/lib/firebase';
import { STRINGS, langFor, type Lang, type Strings } from '@/lib/i18n';
import { loadDraft, loadPool, savePool, saveDraft } from '@/lib/storage';
import { retryUntil } from '@/lib/retry';
import { chipOff, chipOn, cn } from '@/lib/utils';

type SortKey = 'win' | 'ban' | 'pick';

const lanesOf = (hero: string): Lane[] => [
  ...(HERO_LANES[hero] ? [HERO_LANES[hero]] : []),
  ...(HERO_OTHER_LANES[hero] ?? []),
];

const percent = (n: number | undefined) => (n == null ? '-' : `${(n * 100).toFixed(1)}%`);

function Edges({
  title,
  edges,
  portraits,
  bad,
}: {
  title: string;
  edges: HeroEdge[];
  portraits: Record<string, string | null>;
  // These count against the hero, so they read as a loss.
  bad?: boolean;
}) {
  if (!edges.length) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs text-muted-foreground">{title}</h4>
      <ul className="space-y-1">
        {edges.map((e) => (
          <li key={e.hero} className="flex items-center gap-2 text-sm">
            {portraits[e.hero] ? (
              <GameImage src={portraits[e.hero]!} className="size-6 rounded-full" />
            ) : (
              <span className="size-6 rounded-full bg-muted" />
            )}
            <span>{e.hero}</span>
            <span className={cn('text-xs font-medium tabular-nums', bad ? 'text-red-400' : 'text-emerald-400')}>
              {bad ? '-' : '+'}
              {(e.gain * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroPanel({
  hero,
  rank,
  lang,
  pool,
  portraits,
  onPool,
}: {
  hero: string;
  rank: Rank;
  lang: Lang;
  pool: Pool;
  portraits: Record<string, string | null>;
  onPool: (pool: Pool) => void;
}) {
  const t = STRINGS[lang];
  const lanes = lanesOf(hero);
  const [lane, setLane] = useState<Lane>(lanes[0] ?? 'mid');
  const [detail, setDetail] = useState<{ key: string; value: HeroDetail | null } | null>(null);
  const [build, setBuild] = useState<{ key: string; value: TopBuild | null } | null>(null);
  const detailKey = `${hero}|${rank}`;
  const buildKey = `${hero}|${lane}|${rank}`;

  useEffect(() => {
    let current = true;
    fetch(`/api/hero?${new URLSearchParams({ hero, rank })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((value: HeroDetail | null) => {
        if (current) setDetail({ key: detailKey, value });
      })
      .catch(() => {
        if (current) setDetail({ key: detailKey, value: null });
      });
    return () => {
      current = false;
    };
  }, [hero, rank, detailKey]);

  useEffect(() => {
    let current = true;
    fetch(`/api/builds?${new URLSearchParams({ hero, lane, rank })}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((value: TopBuild | null) => {
        if (current) setBuild({ key: buildKey, value });
      })
      .catch(() => {
        if (current) setBuild({ key: buildKey, value: null });
      });
    return () => {
      current = false;
    };
  }, [hero, lane, rank, buildKey]);

  const info = detail?.key === detailKey ? detail : null;
  const shownBuild = build?.key === buildKey ? build : null;
  const listed = (pool[lane] ?? []).includes(hero);

  return (
    <div className="space-y-4 border-t border-border bg-card/60 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {lanes.length === 1 && <span className="text-sm text-muted-foreground">{t.heroPlays(lane.toUpperCase())}</span>}
        {lanes.length > 1 &&
          lanes.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lane === l}
              onClick={() => setLane(l)}
              className={cn(
                'min-h-9 rounded-md px-3 font-display text-xs uppercase tracking-wide',
                lane === l ? chipOn : chipOff,
              )}
            >
              {l}
            </button>
          ))}
        <button
          type="button"
          aria-pressed={listed}
          onClick={() =>
            onPool({
              ...pool,
              [lane]: listed ? pool[lane].filter((h) => h !== hero) : [...(pool[lane] ?? []), hero],
            })
          }
          className="ms-auto min-h-9 rounded-md border border-border px-3 text-sm hover:bg-secondary"
        >
          {listed ? t.removeFromMine(lane.toUpperCase()) : t.addToMine(lane.toUpperCase())}
        </button>
      </div>

      {!info && <p className="text-sm text-muted-foreground">{t.heroLoading}</p>}
      {info && !info.value && <p className="text-sm text-muted-foreground">{t.heroNoData}</p>}
      {info?.value && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Edges title={t.heroBeatenBy} edges={info.value.beatenBy} portraits={portraits} bad />
          <Edges title={t.heroBeats} edges={info.value.beats} portraits={portraits} />
          <Edges title={t.heroPartners} edges={info.value.partners} portraits={portraits} />
        </div>
      )}

      {shownBuild?.value && <InstantBuild top={shownBuild.value} wide />}
    </div>
  );
}

// Every hero's numbers at my rank, for choosing what to learn between games.
// It shares the rank, language and My heroes the draft page keeps.
export function HeroesPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [rank, setRank] = useState<Rank>('all');
  const [pool, setPool] = useState<Pool>(newPool);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState<{ rank: Rank; heroes: MetaHero[] } | null>(null);
  const [portraits, setPortraits] = useState<Record<string, string | null>>({});
  const [lane, setLane] = useState<Lane | 'all'>('all');
  const [sort, setSort] = useState<{ key: SortKey; down: boolean }>({ key: 'win', down: true });
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [accountProblem, setAccountProblem] = useState<((t: Strings) => string) | null>(null);
  const t = STRINGS[lang];

  useEffect(() => watchAccount(setAccount), []);

  // Storage does not exist during the server render, as on the draft page.
  useEffect(() => {
    const saved = loadDraft();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLang(saved.updatedAt ? saved.draft.lang : langFor(navigator.language));
    setRank(saved.draft.rank);
    setPool(loadPool());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    fetch('/api/portraits')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setPortraits)
      .catch(() => {
        /* names show without portraits */
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    return retryUntil<MetaHero[]>(
      () => fetch(`/api/bans?rank=${rank}`).then((r) => (r.ok ? r.json() : [])),
      [],
      (heroes) => heroes.length > 0,
      (heroes) => setMeta({ rank, heroes }),
    );
  }, [ready, rank]);

  // Stamped as an edit, so an older copy in the account does not replace it.
  const saveSettings = (change: { lang?: Lang; rank?: Rank }) => {
    const saved = loadDraft();
    saveDraft({ draft: { ...saved.draft, ...change }, updatedAt: Date.now() });
  };
  const changePool = (next: Pool) => {
    setPool(next);
    savePool(next);
    saveSettings({});
  };

  const heroes = meta?.rank === rank ? meta.heroes : null;
  const found = query.trim() ? new Set(searchHeroes(query, HEROES)) : null;
  const shown = (heroes ?? [])
    .filter((m) => (lane === 'all' || playsLane(m.hero, lane)) && (!found || found.has(m.hero)))
    .sort((a, b) => {
      const gap = (b[sort.key] ?? -1) - (a[sort.key] ?? -1);
      return sort.down ? gap : 0 - gap;
    });

  const columns: { key: SortKey; label: string }[] = [
    { key: 'win', label: t.heroWin },
    { key: 'ban', label: t.heroBan },
    { key: 'pick', label: t.heroPick },
  ];

  return (
    <LangProvider lang={lang}>
      <SiteHeader
        lang={lang}
        onLang={(next) => {
          setLang(next);
          saveSettings({ lang: next });
        }}
      >
        {firebaseReady && (
          <AccountButton
            account={account}
            busy={false}
            problem={accountProblem?.(t) ?? null}
            onSignIn={() =>
              signInWithGoogle().catch(() => setAccountProblem(() => (w: Strings) => w.signInFailed))
            }
            onSignOut={() =>
              signOutOfGoogle().catch(() => setAccountProblem(() => (w: Strings) => w.signOutFailed))
            }
          />
        )}
        <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-9 sm:h-7')}>
          {t.backToDraft}
        </Link>
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-4">
        <div>
          <h2 className="font-display text-lg uppercase tracking-wide">{t.heroesTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.heroesHint}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={query}
            autoComplete="off"
            spellCheck={false}
            placeholder={t.typeHero}
            onValueChange={setQuery}
            className="h-10 bg-background/60 font-medium"
          />
          <label className="relative block">
            <span className="sr-only">{t.myRank}</span>
            <select
              value={rank}
              onChange={(e) => {
                const next = e.target.value as Rank;
                setRank(next);
                saveSettings({ rank: next });
              }}
              className="h-10 w-full appearance-none rounded-lg border border-input bg-background/60 ps-3 pe-9 text-base sm:text-sm"
            >
              {RANKS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.key === 'all' ? t.allRanks : r.key === 'glory' ? t.gloryUp : r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </label>
        </div>

        <div className="grid grid-cols-6 gap-1 sm:flex">
          {(['all', ...LANES.map((l) => l.key)] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={lane === key}
              onClick={() => setLane(key)}
              className={cn(
                'min-h-9 rounded-md px-1 font-display text-xs uppercase tracking-wide sm:px-3',
                lane === key ? chipOn : chipOff,
              )}
            >
              {key === 'all' ? t.allLanes : key}
            </button>
          ))}
        </div>

        {!heroes && <p className="text-sm text-muted-foreground">{t.heroLoading}</p>}
        {heroes && !heroes.length && <p className="text-sm text-muted-foreground">{t.heroNoData}</p>}
        {heroes && heroes.length > 0 && (
          <div className="rounded-lg border border-border">
            {/* The titles stay in view down all 133 rows. */}
            <div className="sticky top-0 z-10 grid grid-cols-[1fr_repeat(3,3.25rem)_1rem] items-center gap-1 rounded-t-lg bg-card px-3 sm:grid-cols-[1fr_repeat(3,6rem)_1rem]">
              <span className="text-xs text-muted-foreground">
                {t.heroCount(shown.length)}
              </span>
              {columns.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={sort.key === c.key}
                  onClick={() =>
                    setSort((s) => (s.key === c.key ? { ...s, down: !s.down } : { key: c.key, down: true }))
                  }
                  className={cn(
                    'inline-flex min-h-10 items-center justify-end gap-0.5 text-xs',
                    sort.key === c.key ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c.label}
                  {sort.key === c.key &&
                    (sort.down ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />)}
                </button>
              ))}
              <span />
            </div>
            <ul>
              {shown.map((m) => (
                <li key={m.hero} className={cn('border-t border-border', open === m.hero && 'bg-card/60')}>
                  <button
                    type="button"
                    aria-expanded={open === m.hero}
                    onClick={() => setOpen((o) => (o === m.hero ? null : m.hero))}
                    className="grid min-h-11 w-full grid-cols-[1fr_repeat(3,3.25rem)_1rem] items-center gap-1 px-3 py-1.5 text-start hover:bg-secondary sm:grid-cols-[1fr_repeat(3,6rem)_1rem]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {portraits[m.hero] ? (
                        <GameImage src={portraits[m.hero]!} className="size-8 shrink-0 rounded-full" />
                      ) : (
                        <span className="size-8 shrink-0 rounded-full bg-muted" />
                      )}
                      <span className="truncate text-sm">{m.hero}</span>
                    </span>
                    <WinRate win={m.win} className="justify-end" />
                    <span className="text-end text-xs tabular-nums text-muted-foreground">{percent(m.ban)}</span>
                    <span className="text-end text-xs tabular-nums text-muted-foreground">{percent(m.pick)}</span>
                    <ChevronDown
                      className={cn('size-4 justify-self-end text-muted-foreground transition-transform', open === m.hero && 'rotate-180')}
                    />
                  </button>
                  {open === m.hero && (
                    <HeroPanel
                      key={m.hero}
                      hero={m.hero}
                      rank={rank}
                      lang={lang}
                      pool={pool}
                      portraits={portraits}
                      onPool={changePool}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </LangProvider>
  );
}
