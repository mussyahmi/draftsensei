'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildPrompt,
  laneLabel,
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
import { HERO_LANES } from '@/lib/heroes';
import type { Picks } from '@/lib/matchups';
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
import { newer } from '@/lib/sync';
import { AccountButton } from '@/components/account-button';
import { AskPanel, type Answer } from '@/components/ask-panel';
import { GameImage } from '@/components/game-image';
import { HeroEntry } from '@/components/hero-entry';
import { LanePicker } from '@/components/lane-picker';
import { PickList } from '@/components/pick-list';
import { PoolDialog } from '@/components/pool-dialog';
import { BanList } from '@/components/ban-list';
import { ChangelogDialog } from '@/components/changelog-dialog';
import type { Release } from '@/lib/changelog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

function PhaseTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg uppercase tracking-wide">
      <span className="text-primary">{n}</span> {children}
    </h2>
  );
}

const SIDES: { key: Side; label: string }[] = [
  { key: 'team', label: 'My team' },
  { key: 'enemy', label: 'Enemy' },
];

export function DraftHelper({ releases }: { releases: Release[] }) {
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [pool, setPool] = useState<Pool>(newPool);
  const [poolOpen, setPoolOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);


  const [answers, setAnswers] = useState<Record<Phase, Answer | null>>({ pick: null, build: null });
  const [loading, setLoading] = useState<Record<Phase, boolean>>({ pick: false, build: false });
  const [errors, setErrors] = useState<Record<Phase, string | null>>({ pick: null, build: null });
  // Today's asks across everyone, out of the one shared free allowance.
  // Null until the server says, or if it cannot count.
  const [used, setUsed] = useState<number | null>(null);
  // Every hero's portrait by name. Empty until loaded, or if the art source
  // is down, in which case names show alone.
  const [portraits, setPortraits] = useState<Record<string, string | null>>({});

  const [account, setAccount] = useState<Account | null>(null);
  // Until the cloud copy has been compared with this device's, saving back
  // up would overwrite it with whatever happens to be here.
  const [reconciled, setReconciled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProblem, setSyncProblem] = useState<string | null>(null);

  // Nothing in localStorage exists during the server render, so load after mount
  // and hold off saving until it is in.
  const [hydrated, setHydrated] = useState(false);

  // Reading localStorage is exactly the "subscribe to an external system"
  // case: it cannot happen during the server render, so the first paint uses
  // defaults and this fills them in once. One extra render, on mount only.
  useEffect(() => {
    const saved = loadDraft();
    /* eslint-disable react-hooks/set-state-in-effect */
    setDraft(saved.draft);
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
    }),
    [draft, pool],
  );

  // What goes along with the prompt: the board as names for hero picks, my
  // hero and lane for a build, so the server can look up real stats.
  const ask = useCallback(async (phase: Phase, asking: string, extra: object) => {
    const fail = (message: string) => setErrors(forPhase<string | null>(phase, message));
    setLoading(forPhase(phase, true));
    setErrors(forPhase<string | null>(phase, null));
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
        fail(`Server error (${response.status}). Check the dev server log.`);
        return;
      }
      if (!response.ok) {
        fail(data.error ?? 'Gemini did not answer.');
      } else {
        setAnswers(
          forPhase<Answer | null>(phase, {
            text: data.text ?? '',
            prompt: asking,
            model: data.model ?? '',
            searched: data.searched ?? false,
            build: phase === 'build',
          }),
        );
        if (typeof data.used === 'number') setUsed(data.used);
      }
    } catch {
      fail('No connection. Use Show prompt and paste it into Gemini.');
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
        setSyncProblem(`Could not read your saved data: ${reason(e)}`);
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
        .catch((e: unknown) => setSyncProblem(`Could not save: ${reason(e)}`))
        .finally(() => setSyncing(false));
    }, 1200);
    return () => clearTimeout(id);
  }, [hydrated, uid, reconciled, draft, pool]);

  const signIn = () => {
    signInWithGoogle().catch(() => setSyncProblem('Sign-in did not complete.'));
  };

  const signOutNow = () => {
    setReconciled(false);
    signOutOfGoogle().catch(() => setSyncProblem('Sign-out did not complete.'));
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
        [side]: d.picks[side].map((p, i) => (i === index ? { ...p, lane } : p)),
      },
    }));
  };

  const removePick = (side: Side, index: number) => {
    setDraft((d) => ({
      ...d,
      picks: { ...d.picks, [side]: d.picks[side].filter((_, i) => i !== index) },
    }));
  };

  const resetDraft = () => {
    // Lane and rank are about the player, not the draft, so they stay.
    setDraft((d) => ({ ...newDraft(), myLane: d.myLane, rank: d.rank }));
    setAnswers({ pick: null, build: null });
    setErrors({ pick: null, build: null });
  };

  const taken = takenHeroes(draft);
  // My hero counts toward my team, once, even if I also typed them in there.
  const counts: Record<Side, number> = {
    team: new Set([...draft.picks.team.map((p) => p.hero), ...(draft.myHero ? [draft.myHero] : [])]).size,
    enemy: draft.picks.enemy.length,
  };

  return (
    <>
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex items-baseline gap-1.5">
            <h1 className="font-display text-xl uppercase tracking-wider">DraftSensei</h1>
            <button
              type="button"
              onClick={() => setChangelogOpen(true)}
              title="What's new"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </button>
          </div>
          {/* On a phone the lane is the control touched most, so it spans the
              width with thumb-sized chips. */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
              I&apos;m playing
            </span>
            <LanePicker
              value={draft.myLane}
              onChange={(lane) => setDraft((d) => ({ ...d, myLane: lane }))}
              className="flex-1 sm:flex-none"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {used !== null && `${used} / ${DAILY_LIMIT} asks today`}
          </span>
          <div className="ms-auto flex items-center gap-1">
            {firebaseReady && (
              <AccountButton
                account={account}
                busy={syncing}
                problem={syncProblem}
                onSignIn={signIn}
                onSignOut={signOutNow}
              />
            )}
            <Button variant="ghost" size="sm" onClick={() => setPoolOpen(true)}>
              My heroes
            </Button>
            <Button variant="ghost" size="sm" onClick={resetDraft}>
              New draft
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-4">
        {/* Groups sit further apart than the parts inside them, so it reads
            which heading and box belong together. */}
        <section className="space-y-6">
          <PhaseTitle n={1}>Picks</PhaseTitle>
          <BanList
            bans={draft.bans}
            unavailable={taken}
            portraits={portraits}
            onChange={(bans) => setDraft((d) => ({ ...d, bans }))}
          />
          <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2">
            {SIDES.map((side) => (
              <div key={side.key} className="space-y-2">
                <h3
                  className={cn(
                    'font-display text-sm uppercase tracking-widest',
                    side.key === 'team' ? 'text-ally' : 'text-enemy',
                  )}
                >
                  {side.label} picks{' '}
                  <span className="text-muted-foreground">{counts[side.key]} / 5</span>
                </h3>
                {/* A full side needs no more typing, so the box goes. */}
                {counts[side.key] < 5 && (
                  <HeroEntry
                    onChoose={(hero) => addPick(side.key, hero)}
                    unavailable={taken}
                    autoFocus={side.key === 'enemy'}
                    portraits={portraits}
                  />
                )}
                <PickList
                  picks={draft.picks[side.key]}
                  side={side.key}
                  onLane={(i, lane) => setLane(side.key, i, lane)}
                  onRemove={(i) => removePick(side.key, i)}
                  portraits={portraits}
                  me={
                    side.key === 'team' && draft.myHero
                      ? { hero: draft.myHero, lane: draft.myLane }
                      : undefined
                  }
                />
              </div>
            ))}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Type a few letters, Enter to add. The lane is filled in for you. Tap
            another lane to change it.
          </p>

          <AskPanel
            label="Suggest heroes"
            prompt={prompts.pick}
            answer={answers.pick}
            loading={loading.pick}
            error={errors.pick}
            portraits={portraits}
            onAsk={askPicks}
          />
        </section>

        <section className="space-y-6 border-t border-border pt-8">
          <PhaseTitle n={2}>My build</PhaseTitle>
          <div className="max-w-sm space-y-2">
            <h3 className="font-display text-sm uppercase tracking-widest text-primary">
              The hero I picked
            </h3>
            <HeroEntry
              onChoose={(hero) => setDraft((d) => ({ ...d, myHero: hero }))}
              // My own team's picks stay selectable; only the enemy's are gone.
              unavailable={draft.picks.enemy.map((p) => p.hero)}
              portraits={portraits}
            />
            {draft.myHero && (
              <p className="flex items-center gap-2 font-display text-lg">
                {portraits[draft.myHero] && (
                  <GameImage src={portraits[draft.myHero]!} className="size-10 rounded-full" />
                )}
                <span>
                  {draft.myHero}{' '}
                  <span className="text-muted-foreground">({laneLabel(draft.myLane)})</span>
                </span>
              </p>
            )}
          </div>

          <AskPanel
            label="Suggest build"
            prompt={prompts.build}
            answer={answers.build}
            loading={loading.build}
            error={errors.build}
            portraits={portraits}
            onAsk={askBuild}
          />
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
        rank={draft.rank}
        onRank={(rank) => setDraft((d) => ({ ...d, rank }))}
      />
    </>
  );
}
