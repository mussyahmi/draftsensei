'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LANES,
  buildPrompt,
  laneLabel,
  newDraft,
  newPool,
  pickPrompt,
  takenHeroes,
  type Draft,
  type Lane,
  type Pool,
  type Side,
} from '@/lib/draft';
import { HERO_LANES } from '@/lib/heroes';
import { countToday, recordAsk, today, type Usage } from '@/lib/usage';
import {
  loadDraft,
  loadPool,
  loadUsage,
  saveDraft,
  savePool,
  saveUsage,
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
import { AnswerBar, type Answer } from '@/components/answer-bar';
import { HeroEntry } from '@/components/hero-entry';
import { LanePicker } from '@/components/lane-picker';
import { PickList } from '@/components/pick-list';
import { PoolDialog } from '@/components/pool-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Step = 1 | 2;
type ActiveChip = { side: Side; index: number } | null;

// Firebase puts the useful part in `code`, e.g. permission-denied. Saying
// which one it is turns a dead end into something you can act on.
const reason = (e: unknown) =>
  (e as { code?: string })?.code ??
  (e instanceof Error ? e.message : 'unknown error');

// One string standing for the whole board, so a save can tell a real edit
// from a re-render.
const contentOf = (step: Step, draft: Draft, pool: Pool) =>
  JSON.stringify({ step, draft, pool });

const SIDES: { key: Side; label: string }[] = [
  { key: 'team', label: 'My team' },
  { key: 'enemy', label: 'Enemy' },
];

export function DraftHelper() {
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [pool, setPool] = useState<Pool>(newPool);
  const [activeChip, setActiveChip] = useState<ActiveChip>(null);
  const [poolOpen, setPoolOpen] = useState(false);

  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  // Read once on mount: today's date is not knowable during a prerender.
  const [day, setDay] = useState('');

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
    setStep(saved.step);
    setDraft(saved.draft);
    setPool(loadPool());
    setUsage(loadUsage());
    setDay(today());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
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
    const content = contentOf(step, draft, pool);

    if (localMark.current === null) {
      // First pass after hydration: adopt the stored time, write nothing.
      localMark.current = { content, at: loadDraft().updatedAt };
      return;
    }
    if (localMark.current.content === content) return;

    const at = Date.now();
    localMark.current = { content, at };
    saveDraft({ step, draft, updatedAt: at });
    savePool(pool);
  }, [hydrated, step, draft, pool]);

  const prompt = step === 1 ? pickPrompt(draft, pool) : buildPrompt(draft);

  const ask = useCallback(async (asking: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: asking }),
      });
      // A crash upstream answers with an HTML error page, not JSON, so read
      // the body defensively rather than reporting it as a dead network.
      const body = await response.text();
      let data: { text?: string; model?: string; error?: string } = {};
      try {
        data = JSON.parse(body);
      } catch {
        setError(`Server error (${response.status}). Check the dev server log.`);
        return;
      }
      if (!response.ok) {
        setError(data.error ?? 'Gemini did not answer.');
      } else {
        setAnswer({
          text: data.text ?? '',
          prompt: asking,
          model: data.model ?? '',
        });
        const now = today();
        setDay(now);
        setUsage((u) => {
          const next = recordAsk(u, now);
          saveUsage(next);
          return next;
        });
      }
    } catch {
      setError('No connection. Use Show prompt and paste it into Gemini.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!loading) ask(prompt);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ask, prompt, loading]);

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
          { step: saved.step, draft: saved.draft, pool: loadPool(), updatedAt: saved.updatedAt },
          remote,
        );
        if (winner) {
          setStep(winner.step);
          setDraft(winner.draft);
          setPool(winner.pool);
          // Both sides now hold the winner, so neither save should fire for it.
          const content = contentOf(winner.step, winner.draft, winner.pool);
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
    const content = contentOf(step, draft, pool);
    if (cloudMark.current === content) return;

    const id = setTimeout(() => {
      cloudMark.current = content;
      setSyncing(true);
      saveRemote(uid, {
        step,
        draft,
        pool,
        updatedAt: localMark.current?.at ?? Date.now(),
      })
        .then(() => setSyncProblem(null))
        .catch((e: unknown) => setSyncProblem(`Could not save: ${reason(e)}`))
        .finally(() => setSyncing(false));
    }, 1200);
    return () => clearTimeout(id);
  }, [hydrated, uid, reconciled, step, draft, pool]);

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
    setActiveChip({ side, index: draft.picks[side].length });
  };

  const setLane = (side: Side, index: number, lane: Lane) => {
    setDraft((d) => ({
      ...d,
      picks: {
        ...d.picks,
        [side]: d.picks[side].map((p, i) => (i === index ? { ...p, lane } : p)),
      },
    }));
    setActiveChip(null);
  };

  const removePick = (side: Side, index: number) => {
    setDraft((d) => ({
      ...d,
      picks: { ...d.picks, [side]: d.picks[side].filter((_, i) => i !== index) },
    }));
    setActiveChip(null);
  };

  // 1–5 re-lanes the pick just added, without leaving the keyboard.
  const laneShortcut = (key: string) => {
    if (!activeChip || !/^[1-5]$/.test(key)) return false;
    setLane(activeChip.side, activeChip.index, LANES[Number(key) - 1].key);
    return true;
  };

  const resetDraft = () => {
    setDraft((d) => ({ ...newDraft(), myLane: d.myLane }));
    setStep(1);
    setActiveChip(null);
    setAnswer(null);
    setError(null);
  };

  const taken = takenHeroes(draft);

  return (
    <>
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="font-display text-xl uppercase tracking-wider">
            DraftSensei
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              I&apos;m playing
            </span>
            <LanePicker
              value={draft.myLane}
              onChange={(lane) => setDraft((d) => ({ ...d, myLane: lane }))}
            />
          </div>
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

      <nav className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl gap-1 px-4 py-2">
          {([1, 2] as Step[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setStep(n);
                setActiveChip(null);
              }}
              aria-current={step === n}
              className={cn(
                'rounded-md px-3 py-1.5 font-display text-sm uppercase tracking-wide',
                step === n
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="text-primary">{n}</span>{' '}
              {n === 1 ? 'Picks' : 'My build'}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        {step === 1 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {SIDES.map((side) => (
                <section key={side.key} className="space-y-3">
                  <h2
                    className={cn(
                      'font-display text-sm uppercase tracking-widest',
                      side.key === 'team' ? 'text-ally' : 'text-enemy',
                    )}
                  >
                    {side.label} picks
                  </h2>
                  <HeroEntry
                    onChoose={(hero) => addPick(side.key, hero)}
                    unavailable={taken}
                    onBareKey={laneShortcut}
                    autoFocus={side.key === 'enemy'}
                  />
                  <PickList
                    picks={draft.picks[side.key]}
                    side={side.key}
                    activeIndex={
                      activeChip?.side === side.key ? activeChip.index : null
                    }
                    onLane={(i, lane) => setLane(side.key, i, lane)}
                    onRemove={(i) => removePick(side.key, i)}
                  />
                </section>
              ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Type a few letters, Enter to add. The lane is filled in for you — press
              1–5 or click to change it: 1 exp · 2 mid · 3 jungle · 4 gold · 5 roam.
              ⌘/Ctrl+Enter asks.
            </p>
          </>
        ) : (
          <section className="max-w-sm space-y-3">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">
              The hero I picked
            </h2>
            <HeroEntry
              onChoose={(hero) => setDraft((d) => ({ ...d, myHero: hero }))}
              // My own team's picks stay selectable — only the enemy's are gone.
              unavailable={draft.picks.enemy.map((p) => p.hero)}
              autoFocus
            />
            {draft.myHero && (
              <p className="font-display text-lg">
                {draft.myHero}{' '}
                <span className="text-muted-foreground">
                  — {laneLabel(draft.myLane)}
                </span>
              </p>
            )}
          </section>
        )}
      </main>

      <AnswerBar
        prompt={prompt}
        answer={answer}
        loading={loading}
        error={error}
        asksToday={countToday(usage, day)}
        onAsk={() => ask(prompt)}
      />

      <PoolDialog
        open={poolOpen}
        onOpenChange={setPoolOpen}
        pool={pool}
        onChange={setPool}
      />
    </>
  );
}
