'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import {
  isEmptyDraft,
  moveToLane,
  buildPrompt,
  newDraft,
  newPool,
  pickPrompt,
  poolFor,
  takenHeroes,
  type Draft,
  type Lane,
  type Pool,
  type Side,
} from '@/lib/draft';
import { HERO_LANES, HEROES } from '@/lib/heroes';
import { picksOf } from '@/lib/icons';
import { isRisky, type Picks } from '@/lib/matchups';
import { DAILY_LIMIT } from '@/lib/quota';
import {
  loadDraft,
  loadPool,
  saveDraft,
  savePool,
} from '@/lib/storage';
import {
  loadRemote,
  saveRemote,
  signInWithGoogle,
  signOutOfGoogle,
  watchAccount,
  type Account,
} from '@/lib/cloud';
import { firebaseReady } from '@/lib/firebase';
import { retryUntil } from '@/lib/retry';
import { newer } from '@/lib/sync';
import { AccountButton } from '@/components/account-button';
import { AskPanel, type Answer } from '@/components/ask-panel';
import { GameImage } from '@/components/game-image';
import { HeroEntry } from '@/components/hero-entry';
import { YouCard } from '@/components/you-card';
import { PickList } from '@/components/pick-list';
import { DraftCheckCard } from '@/components/draft-check-card';
import { PoolDialog } from '@/components/pool-dialog';
import { TeammatePicks } from '@/components/teammate-picks';
import { ThreatLine } from '@/components/threat-line';
import { WinRate } from '@/components/win-rate';
import { BanList } from '@/components/ban-list';
import { winsBy, type MetaHero } from '@/lib/bans';
import { enemyDamage, offLane, teamGaps } from '@/lib/team-balance';
import { PickSuggestions } from '@/components/pick-suggestions';
import { HowTo } from '@/components/how-to';
import { InstantBuild, type TopBuild } from '@/components/instant-build';
import type { Ranked } from '@/lib/matchups';
import { ChangelogDialog } from '@/components/changelog-dialog';
import { LikelyLine } from '@/components/likely-line';
import { likelyEnemies } from '@/lib/likely';
import type { Release } from '@/lib/changelog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LangProvider } from '@/components/lang';
import { SiteHeader } from '@/components/site-header';
import { STRINGS, langFor, type Strings } from '@/lib/i18n';

// The page asks twice: which hero to pick, then how to build them.
type Phase = 'pick' | 'build';

// Firebase puts the useful part in `code`, e.g. permission-denied. Saying
// which one it is turns a dead end into something you can act on.
const reason = (e: unknown) =>
  (e as { code?: string })?.code ??
  (e instanceof Error ? e.message : 'unknown error');

// One string standing for the whole board, so a save can tell a real edit
// from a re-render.
const contentOf = (draft: Draft, pool: Pool) => JSON.stringify({ draft, pool });

// Sets one phase's slot in a per-phase record, leaving the other alone.
const forPhase =
  <T,>(phase: Phase, value: T) =>
  (r: Record<Phase, T>) => ({ ...r, [phase]: value });

function PhaseTitle({ n, children, aside }: { n: number; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <h2 className="mb-4! font-display text-lg uppercase tracking-wide">
      <span className="text-primary">{n}</span> {children}
      {aside && <span className="ms-2 font-sans text-sm normal-case tracking-normal text-muted-foreground">{aside}</span>}
    </h2>
  );
}

const SIDES: Side[] = ['team', 'enemy'];
const UNDO_MS = 8000;

// A message to show in whichever language is on when it is shown, so a
// switch of language mid-error does not leave the old one on screen.
type Say = (t: Strings) => string;

export function DraftHelper({ releases }: { releases: Release[] }) {
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [pool, setPool] = useState<Pool>(newPool);
  const [poolOpen, setPoolOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);

  const [answers, setAnswers] = useState<Record<Phase, Answer | null>>({ pick: null, build: null });
  const [loading, setLoading] = useState<Record<Phase, boolean>>({ pick: false, build: false });
  const [errors, setErrors] = useState<Record<Phase, Say | null>>({ pick: null, build: null });
  // Today's asks across everyone, out of the one shared free allowance.
  // Null until the server says, or if it cannot count.
  const [used, setUsed] = useState<number | null>(null);
  // Every hero's portrait by name. Empty until loaded, or if the art source
  // is down, in which case names show alone.
  const [portraits, setPortraits] = useState<Record<string, string | null>>({});
  // Every hero strongest first at my rank, for ban suggestions and the win
  // rates in My heroes. Empty until
  // loaded, or if the data source is down, in which case none are shown.
  const [meta, setMeta] = useState<MetaHero[]>([]);
  const wins = winsBy(meta);
  // The best heroes for my lane as the board stands, from match data alone.
  const [instant, setInstant] = useState<Ranked[]>([]);
  // The Academy's winning build for my hero, shown before any ask. Kept
  // with the hero it is for, so a changed hero never shows the old build.
  const [topBuild, setTopBuild] = useState<(TopBuild & { for: string }) | null>(null);

  const [account, setAccount] = useState<Account | null>(null);
  // Until the cloud copy has been compared with this device's, saving back
  // up would overwrite it with whatever happens to be here.
  const [reconciled, setReconciled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProblem, setSyncProblem] = useState<Say | null>(null);

  // Nothing in localStorage exists during the server render, so load after mount
  // and hold off saving until it is in.
  const [hydrated, setHydrated] = useState(false);

  // Reading localStorage is exactly the "subscribe to an external system"
  // case: it cannot happen during the server render, so the first paint uses
  // defaults and this fills them in once. One extra render, on mount only.
  useEffect(() => {
    const saved = loadDraft();
    /* eslint-disable react-hooks/set-state-in-effect */
    // Nothing saved yet means a first visit: start in the phone's language.
    setDraft(saved.updatedAt ? saved.draft : { ...saved.draft, lang: langFor(navigator.language) });
    setPool(loadPool());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Everyone shares one daily allowance, so show how much of it is gone. Asks
  // keep it current after this.
  useEffect(() => {
    fetch('/api/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((u: { used: number | null } | null) => {
        if (typeof u?.used === 'number') setUsed(u.used);
      })
      .catch(() => {
        /* no count shown; asking still works */
      });
    fetch('/api/portraits')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setPortraits)
      .catch(() => {
        /* names show without portraits */
      });
  }, []);

  // Strongest heroes at my rank, and what beats the heroes I play in my lane;
  // asked again only when one of those changes.
  const mine = poolFor(pool, draft.myLane).join('|');
  useEffect(() => {
    if (!hydrated) return;
    const query = new URLSearchParams({ rank: draft.rank });
    for (const hero of mine ? mine.split('|') : []) query.append('mine', hero);
    // Comes back empty while the data source is rate-limiting.
    return retryUntil<MetaHero[]>(
      () => fetch(`/api/bans?${query}`).then((r) => (r.ok ? r.json() : [])),
      [],
      (m) => m.length > 0,
      setMeta,
    );
  }, [hydrated, draft.rank, mine]);

  // What was last written, and when. Refs, because these are bookkeeping for
  // the save effects rather than anything the screen renders — and they are
  // only ever touched inside effects, never during a render.
  const localMark = useRef<{ content: string; at: number } | null>(null);
  const cloudMark = useRef<string | null>(null);

  // Saving must not happen just because the component mounted. Re-stamping an
  // unchanged board made this device look newer than the cloud, so signing in
  // on a second device overwrote good data with an empty draft.
  useEffect(() => {
    if (!hydrated) return;
    const content = contentOf(draft, pool);

    if (localMark.current === null) {
      // First pass after hydration: adopt the stored time, write nothing.
      localMark.current = { content, at: loadDraft().updatedAt };
      return;
    }
    if (localMark.current.content === content) return;

    const at = Date.now();
    localMark.current = { content, at };
    saveDraft({ draft, updatedAt: at });
    savePool(pool);
  }, [hydrated, draft, pool]);

  const prompts: Record<Phase, string> = {
    pick: pickPrompt(draft, pool),
    build: buildPrompt(draft),
  };
  // A hero pick ask carries the board as names, so the server can look up
  // real counters for it. A build ask needs none: the server checks it
  // against the current shop instead.
  const likely = useMemo(
    () =>
      likelyEnemies(meta, draft.picks.enemy, [
        ...draft.picks.team.map((p) => p.hero),
        ...draft.bans,
        ...(draft.myHero ? [draft.myHero] : []),
      ]),
    [meta, draft],
  );
  const emptyBoard = !draft.picks.enemy.length && !draft.picks.team.length;
  // My own hero counts: the enemy answers it, and teammates still get advice.
  const expectEnemy = !emptyBoard || Boolean(draft.myHero);
  const picks = useMemo<Picks>(
    () => ({
      lane: draft.myLane,
      enemy: draft.picks.enemy.map((p) => p.hero),
      team: draft.picks.team.map((p) => p.hero),
      pool: poolFor(pool, draft.myLane),
      bans: draft.bans,
      rank: draft.rank,
      // The enemy in my lane: that matchup counts most.
      opponent: draft.picks.enemy.find((p) => p.lane === draft.myLane)?.hero,
      // Nothing to answer on an empty board: first picks have their own list.
      ...(expectEnemy && likely.heroes.length > 0 && { likely: likely.heroes }),
    }),
    [draft, pool, likely, expectEnemy],
  );

  // Ranked again whenever the board changes. A short wait lets a burst of
  // edits settle into one request, and a late answer for an older board is
  // dropped.
  useEffect(() => {
    if (!hydrated) return;
    const empty = !picks.enemy.length && !picks.team.length;
    let stop = () => {};
    const timer = setTimeout(() => {
      stop = retryUntil<Ranked[]>(
        () =>
          fetch('/api/picks', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ picks }),
          }).then((r) => (r.ok ? r.json() : [])),
        [],
        // On an empty board, win rates alone are not yet the safe picks.
        (ranked) => ranked.length > 0 && (!empty || ranked.some((r) => r.worst !== undefined)),
        setInstant,
      );
    }, 250);
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [hydrated, picks]);

  // On a phone an answer lands out of sight: the AI's picks in the chips
  // above the lists, the AI's build low under its button. Bring each into
  // view when it arrives.
  const chipsRef = useRef<HTMLDivElement>(null);
  const buildRef = useRef<HTMLDivElement>(null);
  const buildSectionRef = useRef<HTMLElement>(null);
  // Set when a hero chip is tapped: the build section comes into view, and
  // again once its build has loaded, since only then is the page long
  // enough to bring it to the top.
  const showBuildNext = useRef(false);
  const reveal = (el: HTMLElement | null) => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  };
  const pickFromChips = useCallback((hero: string) => {
    setDraft((d) => ({ ...d, myHero: hero }));
    // The hero is chosen; what comes next is its build.
    showBuildNext.current = true;
    requestAnimationFrame(() => reveal(buildSectionRef.current));
  }, []);

  useEffect(() => {
    if (!draft.myHero) return;
    const key = `${draft.myHero}|${draft.myLane}|${draft.rank}`;
    const params = new URLSearchParams({ hero: draft.myHero, lane: draft.myLane, rank: draft.rank });
    let current = true;
    fetch(`/api/builds?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((top: TopBuild | null) => {
        if (!current) return;
        setTopBuild(top ? { ...top, for: key } : null);
        if (showBuildNext.current) {
          showBuildNext.current = false;
          requestAnimationFrame(() => reveal(buildSectionRef.current));
        }
      })
      .catch(() => {
        /* no instant build; Suggest build still works */
      });
    return () => {
      current = false;
    };
  }, [draft.myHero, draft.myLane, draft.rank]);

  // What goes along with the prompt: the board as names for hero picks, my
  // hero and lane for a build, so the server can look up real stats.
  const pickAnswer = answers.pick;
  const buildAnswer = answers.build;
  useEffect(() => {
    if (pickAnswer) reveal(chipsRef.current);
  }, [pickAnswer]);
  useEffect(() => {
    if (buildAnswer) reveal(buildRef.current);
  }, [buildAnswer]);


  const ask = useCallback(async (phase: Phase, asking: string, extra: object) => {
    const fail = (message: Say) => setErrors(forPhase<Say | null>(phase, message));
    setLoading(forPhase(phase, true));
    setErrors(forPhase<Say | null>(phase, null));
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: asking, build: phase === 'build', ...extra }),
      });
      // A crash upstream answers with an HTML error page, not JSON, so read
      // the body defensively rather than reporting it as a dead network.
      const body = await response.text();
      let data: {
        text?: string;
        model?: string;
        searched?: boolean;
        used?: number | null;
        error?: string;
      } = {};
      try {
        data = JSON.parse(body);
      } catch {
        fail((t) => t.serverError(response.status));
        return;
      }
      if (!response.ok) {
        // A stall is the one failure worth saying in the player's language;
        // the rest are Google's own words, which say exactly what went wrong.
        const error = data.error;
        fail(response.status === 504 ? (t) => t.tooSlow : (t) => error ?? t.noAnswer);
      } else {
        setAnswers(
          forPhase<Answer | null>(phase, {
            text: data.text ?? '',
            prompt: asking,
            model: data.model ?? '',
            searched: data.searched ?? false,
            build: phase === 'build',
            hero: (extra as { hero?: string }).hero,
          }),
        );
        if (typeof data.used === 'number') setUsed(data.used);
      }
    } catch {
      fail((t) => t.noConnection);
    } finally {
      setLoading(forPhase(phase, false));
    }
  }, []);

  const askPicks = () => ask('pick', prompts.pick, { picks });
  const askBuild = () =>
    ask('build', prompts.build, { hero: draft.myHero, lane: draft.myLane, rank: draft.rank });

  /* ---------- the signed-in account ---------- */

  const uid = account?.uid ?? null;

  useEffect(() => watchAccount(setAccount), []);

  // On sign-in, compare the cloud copy with this device's and keep whichever
  // was written last. Local state is read back out of storage rather than out
  // of React, so this runs once per account instead of once per keystroke.
  useEffect(() => {
    if (!hydrated || !uid) return;
    cloudMark.current = null;
    let dropped = false;

    loadRemote(uid)
      .then((remote) => {
        if (dropped) return;
        const saved = loadDraft();
        const winner = newer(
          { draft: saved.draft, pool: loadPool(), updatedAt: saved.updatedAt },
          remote,
        );
        if (winner) {
          setDraft(winner.draft);
          setPool(winner.pool);
          // Both sides now hold the winner, so neither save should fire for it.
          const content = contentOf(winner.draft, winner.pool);
          localMark.current = { content, at: winner.updatedAt };
          cloudMark.current = content;
        }
        setSyncProblem(null);
        setReconciled(true);
      })
      .catch((e: unknown) => {
        if (dropped) return;
        setSyncProblem(() => (t: Strings) => t.readFailed(reason(e)));
        setReconciled(true);
      });

    return () => {
      dropped = true;
    };
  }, [hydrated, uid]);

  // Push changes up, a moment after you stop typing.
  useEffect(() => {
    if (!hydrated || !uid || !reconciled) return;
    const content = contentOf(draft, pool);
    if (cloudMark.current === content) return;

    const id = setTimeout(() => {
      cloudMark.current = content;
      setSyncing(true);
      saveRemote(uid, {
        draft,
        pool,
        updatedAt: localMark.current?.at ?? Date.now(),
      })
        .then(() => setSyncProblem(null))
        .catch((e: unknown) => setSyncProblem(() => (t: Strings) => t.saveFailed(reason(e))))
        .finally(() => setSyncing(false));
    }, 1200);
    return () => clearTimeout(id);
  }, [hydrated, uid, reconciled, draft, pool]);

  const signIn = () => {
    signInWithGoogle().catch(() => setSyncProblem(() => (t: Strings) => t.signInFailed));
  };

  const signOutNow = () => {
    setReconciled(false);
    signOutOfGoogle().catch(() => setSyncProblem(() => (t: Strings) => t.signOutFailed));
  };

  const addPick = (side: Side, hero: string) => {
    setDraft((d) => ({
      ...d,
      picks: {
        ...d.picks,
        [side]: [...d.picks[side], { hero, lane: HERO_LANES[hero] ?? 'mid' }],
      },
    }));
  };

  const setLane = (side: Side, index: number, lane: Lane) => {
    setDraft((d) => ({
      ...d,
      picks: {
        ...d.picks,
        [side]: moveToLane(d.picks[side], index, lane),
      },
    }));
  };

  const removePick = (side: Side, index: number) => {
    setDraft((d) => ({
      ...d,
      picks: { ...d.picks, [side]: d.picks[side].filter((_, i) => i !== index) },
    }));
  };

  // A slip of the thumb on New draft should not cost the whole board.
  const [undo, setUndo] = useState<{ draft: Draft; answers: Record<Phase, Answer | null> } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const resetDraft = () => {
    // An empty board has nothing to bring back, and must not replace a draft
    // the last press could still restore.
    if (!isEmptyDraft(draft)) setUndo({ draft, answers });
    // Lane, rank and language are about the player, not the draft, so they stay.
    setDraft((d) => ({ ...newDraft(), myLane: d.myLane, rank: d.rank, lang: d.lang }));
    setAnswers({ pick: null, build: null });
    setErrors({ pick: null, build: null });
  };

  const taken = takenHeroes(draft);
  // My hero counts toward my team, once, even if I also typed them in there.
  const counts: Record<Side, number> = {
    team: new Set([...draft.picks.team.map((p) => p.hero), ...(draft.myHero ? [draft.myHero] : [])]).size,
    enemy: draft.picks.enemy.length,
  };

  const gaps = teamGaps([...new Set([...draft.picks.team.map((p) => p.hero), ...(draft.myHero ? [draft.myHero] : [])])]);
  // My own row goes by my lane, whatever lane I typed myself in under.
  const offLanes = offLane([
    ...draft.picks.team.filter((p) => p.hero !== draft.myHero),
    ...(draft.myHero ? [{ hero: draft.myHero, lane: draft.myLane }] : []),
  ]);
  const enemyHits = enemyDamage(draft.picks.enemy.map((p) => p.hero));

  const t = STRINGS[draft.lang];

  // The AI's picks for the board as it is now. Once the board changes they
  // are about a draft that no longer exists, and the fresh chips return.
  const answeredPicks = answers.pick ? picksOf(answers.pick.text, HEROES) : [];
  const aiPicks = answers.pick && answers.pick.prompt === prompts.pick ? answeredPicks : null;

  const top = topBuild && topBuild.for === `${draft.myHero}|${draft.myLane}|${draft.rank}` ? topBuild : null;
  // An answer for a hero I have since swapped is not an adjustment of this one.
  const adjusted = answers.build !== null && answers.build.hero === draft.myHero;

  return (
    <LangProvider lang={draft.lang}>
      <SiteHeader
        lang={draft.lang}
        onLang={(lang) => setDraft((d) => ({ ...d, lang }))}
        onVersion={() => setChangelogOpen(true)}
        note={
          <span className="text-xs text-muted-foreground">
            {/* Only worth a glance once the shared allowance runs low. */}
            {used !== null && used >= DAILY_LIMIT * 0.8 && t.asksToday(used, DAILY_LIMIT)}
          </span>
        }
      >
        {firebaseReady && (
          <AccountButton
            account={account}
            busy={syncing}
            problem={syncProblem?.(t) ?? null}
            onSignIn={signIn}
            onSignOut={signOutNow}
          />
        )}
        <Link href="/heroes" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-9 sm:h-7')}>
          {t.heroesLink}
        </Link>
        <Button variant="ghost" size="sm" className="h-9 sm:h-7" onClick={() => setPoolOpen(true)}>
          {t.myHeroes}
        </Button>
        {/* It wipes the board, so it stands apart from the others. */}
        <span className="ms-1 border-s border-border ps-1">
          <Button variant="ghost" size="sm" className="h-9 sm:h-7" onClick={resetDraft}>
            {t.newDraft}
          </Button>
        </span>
      </SiteHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-4">
        {undo && (
          <p role="status" className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-1 text-sm">
            {t.draftCleared}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-primary sm:h-7"
              onClick={() => {
                setDraft(undo.draft);
                setAnswers(undo.answers);
                setUndo(null);
              }}
            >
              {t.undo}
            </Button>
          </p>
        )}
        {/* Groups sit further apart than the parts inside them, so it reads
            which heading and box belong together. */}
        {/* Who is playing: set once, so it sits above the numbered steps of
            the draft rather than being one of them. */}
        <section className="space-y-6">
          {hydrated &&
            isEmptyDraft(draft) && <HowTo />}
          {/* On a phone the lane is the control touched most, so it spans the
              width with thumb-sized chips. */}
          <YouCard
            lane={draft.myLane}
            rank={draft.rank}
            onLane={(lane) => setDraft((d) => ({ ...d, myLane: lane }))}
            onRank={(rank) => setDraft((d) => ({ ...d, rank }))}
          />
        </section>

        {/* The steps follow the game's own draft: bans, then picks, then the
            build once the hero is locked in. */}
        <section className="space-y-6 border-t border-border pt-8">
          <PhaseTitle n={1} aside={`${draft.bans.length} / 10 · ${t.optional}`}>
            {t.bans}
          </PhaseTitle>
          <BanList
            bans={draft.bans}
            unavailable={taken}
            portraits={portraits}
            meta={meta}
            onChange={(bans) => setDraft((d) => ({ ...d, bans }))}
          />
        </section>

        <section className="space-y-6 border-t border-border pt-8">
          <PhaseTitle n={2}>{t.picks}</PhaseTitle>
          {/* Above the lists, so a new pick never pushes them out of sight. */}
          <div ref={chipsRef} className="scroll-mt-4 empty:hidden">
            {/* A full team has no pick left to suggest. */}
            {!draft.myHero && counts.team < 5 && (
              <PickSuggestions
                ranked={instant}
                heading={
                  emptyBoard && instant.some((r) => r.worst !== undefined)
                    ? instant.some(isRisky)
                      ? t.strongFirst
                      : t.safeFirst
                    : undefined
                }
                ai={aiPicks}
                portraits={portraits}
                onPick={pickFromChips}
              />
            )}
          </div>

          {/* Open lanes keep going after my own pick: that is often when
              teammates are still deciding. */}
          {counts.team < 5 && (
            <TeammatePicks
              board={{
                ...picks,
                team: [...new Set([...picks.team, ...(draft.myHero ? [draft.myHero] : [])])],
              }}
              closed={[draft.myLane, ...draft.picks.team.map((p) => p.lane)]}
              portraits={portraits}
              onAdd={(hero, lane) =>
                setDraft((d) => ({
                  ...d,
                  picks: { ...d.picks, team: [...d.picks.team, { hero, lane }] },
                }))
              }
            />
          )}

          <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2">
            {SIDES.map((side) => (
              <div key={side} className="space-y-2">
                <h3
                  className={cn(
                    'font-display text-sm uppercase tracking-widest',
                    side === 'team' ? 'text-ally' : 'text-enemy',
                  )}
                >
                  {side === 'team' ? t.teamPicks : t.enemyPicks}{' '}
                  <span className="text-muted-foreground">{counts[side]} / 5</span>
                </h3>
                {/* A full side needs no more typing, so the box goes. */}
                {counts[side] < 5 && (
                  <HeroEntry
                    onChoose={(hero) => addPick(side, hero)}
                    unavailable={taken}
                    autoFocus={side === 'enemy'}
                    portraits={portraits}
                  />
                )}
                <PickList
                  picks={draft.picks[side]}
                  side={side}
                  onLane={(i, lane) => setLane(side, i, lane)}
                  onRemove={(i) => removePick(side, i)}
                  portraits={portraits}
                  me={
                    side === 'team' && draft.myHero
                      ? { hero: draft.myHero, lane: draft.myLane }
                      : undefined
                  }
                  onClearMe={() => setDraft((d) => ({ ...d, myHero: newDraft().myHero }))}
                />
                {/* Once the draft is full, Draft check says this instead. */}
                {side === 'enemy' && counts.enemy >= 1 && counts.team >= 2 && (counts.team < 5 || counts.enemy < 5) && (
                  <ThreatLine
                    team={[...new Set([...draft.picks.team.map((p) => p.hero), ...(draft.myHero ? [draft.myHero] : [])])]}
                    enemy={draft.picks.enemy.map((p) => p.hero)}
                    rank={draft.rank}
                  />
                )}
                {side === 'enemy' && expectEnemy && counts.enemy < 5 && (
                  <LikelyLine likely={likely} showOpen={counts.enemy > 0} portraits={portraits} />
                )}
                {side === 'team' &&
                  offLanes.map((o) => (
                    <p key={o.hero} className="flex items-center gap-1.5 text-sm text-primary">
                      <TriangleAlert className="size-4 shrink-0" />
                      {t.offLane(o.hero, o.usual.toUpperCase(), o.lane.toUpperCase())}
                    </p>
                  ))}
                {side === 'team' && gaps.length > 0 && (
                  <p className="flex items-center gap-1.5 text-sm text-primary">
                    <TriangleAlert className="size-4 shrink-0" />
                    {gaps.map((gap) => t.gaps[gap]).join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>


          {counts.team < 5 && (
            <AskPanel
              label={instant.length && (picks.enemy.length || picks.team.length) ? t.askAiPick : t.suggestHeroes}
              // The AI's picks show as the chips above, and once the board moves
              // on the fresh chips take over; only an answer that names no hero
              // is left to read as text.
              showAnswer={!answeredPicks.length}
              prompt={prompts.pick}
              answer={answers.pick}
              loading={loading.pick}
              error={errors.pick?.(t) ?? null}
              portraits={portraits}
              onAsk={askPicks}
            />
          )}

          {counts.team === 5 && counts.enemy === 5 && (
            <DraftCheckCard
              team={[...new Set([...draft.picks.team.map((p) => p.hero), ...(draft.myHero ? [draft.myHero] : [])])]}
              enemy={draft.picks.enemy.map((p) => p.hero)}
              me={draft.myHero || draft.picks.team.find((p) => p.lane === draft.myLane)?.hero || null}
              opponent={draft.picks.enemy.find((p) => p.lane === draft.myLane)?.hero ?? null}
              rank={draft.rank}
            />
          )}
        </section>

        <section ref={buildSectionRef} className="scroll-mt-4 space-y-6 border-t border-border pt-8">
          <PhaseTitle n={3}>{t.myBuild}</PhaseTitle>
          <div className="max-w-sm space-y-2">
            <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
              {t.heroIPicked}
            </h3>
            <HeroEntry
              onChoose={(hero) => setDraft((d) => ({ ...d, myHero: hero }))}
              // My own team's picks stay selectable; only the enemy's are gone.
              unavailable={draft.picks.enemy.map((p) => p.hero)}
              portraits={portraits}
              // Choosing my own hero is the one place a win rate helps: is it
              // strong at my rank before I lock it in?
              wins={wins}
            />
            {draft.myHero && (
              <p className="flex items-center gap-2 font-display text-lg">
                {portraits[draft.myHero] && (
                  <GameImage src={portraits[draft.myHero]!} className="size-10 rounded-full" />
                )}
                <span>
                  {draft.myHero}{' '}
                  <span className="text-muted-foreground">({draft.myLane.toUpperCase()})</span>
                </span>
                {wins[draft.myHero] != null && <WinRate win={wins[draft.myHero]} />}
              </p>
            )}
          </div>

          {/* The instant build is the same into any team, so this says what
              this enemy team calls for without an ask. */}
          {draft.myHero && enemyHits && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t.enemyDamage(enemyHits.physical, enemyHits.magic, enemyHits.mixed)}
              </span>{' '}
              {t.defenseTip[enemyHits.lean]}
            </p>
          )}

          {/* One build on screen: the ranked one until the AI has adjusted it
              for this enemy team, then the adjusted one in its place. */}
          {top && !adjusted && <InstantBuild top={top} />}

          <div ref={buildRef} className="scroll-mt-4">
            <AskPanel
              label={top ? t.adjustBuild : t.suggestBuild}
              // A build is for a hero; without one there is nothing to ask.
              blocked={draft.myHero ? null : t.pickHeroFirst}
              baseline={top?.build.items}
              prompt={prompts.build}
              answer={answers.build}
              loading={loading.build}
              error={errors.build?.(t) ?? null}
              portraits={portraits}
              onAsk={askBuild}
            />
          </div>
        </section>
      </main>

      <ChangelogDialog
        open={changelogOpen}
        onOpenChange={setChangelogOpen}
        releases={releases}
      />

      <PoolDialog
        open={poolOpen}
        onOpenChange={setPoolOpen}
        pool={pool}
        onChange={setPool}
        portraits={portraits}
        wins={wins}
      />
    </LangProvider>
  );
}
