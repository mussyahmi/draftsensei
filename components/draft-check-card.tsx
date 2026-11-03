'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useT } from '@/components/lang';
import type { Rank } from '@/lib/draft';
import type { DraftCheck } from '@/lib/draft-check';
import { cn } from '@/lib/utils';

type Props = {
  team: string[];
  enemy: string[];
  me: string | null;
  opponent: string | null;
  rank: Rank;
};

// Half a point across every matchup is noise, not a lead.
const EVEN = 0.005;

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

function Gain({ value }: { value: number }) {
  return (
    <span className={cn('font-medium tabular-nums', value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
      {value >= 0 ? '+' : '-'}
      {percent(Math.abs(value))}
    </span>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

// What the finished draft looks like before the game loads. The picks are
// locked by now, so it says what to expect; it has nothing left to suggest.
export function DraftCheckCard({ team, enemy, me, opponent, rank }: Props) {
  const t = useT();
  const asked = JSON.stringify({ team, enemy, me, opponent, rank });
  const [answer, setAnswer] = useState<{ asked: string; check: DraftCheck } | null>(null);

  useEffect(() => {
    let current = true;
    fetch('/api/draft-check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: asked })
      .then((r) => (r.ok ? r.json() : null))
      .then((check: DraftCheck | null) => {
        if (current && check) setAnswer({ asked, check });
      })
      .catch(() => {
        /* no check; the draft itself is unaffected */
      });
    return () => {
      current = false;
    };
  }, [asked]);

  const check = answer?.asked === asked ? answer.check : null;
  if (!check) return null;
  const { lane, strength, counters, combo, damage } = check;
  const split = (s: DraftCheck['damage']['team']) => t.damageSplit(s.physical, s.magic, s.mixed);

  return (
    <section className="space-y-3 rounded-lg bg-card p-4">
      <div>
        <h3 className="font-display text-sm uppercase tracking-widest text-primary">{t.draftCheck}</h3>
        <p className="text-xs text-muted-foreground">{t.draftCheckHint}</p>
      </div>
      <dl className="space-y-3">
        {lane && (
          <Row label={t.checkLane}>
            {lane.me} vs {lane.enemy} <Gain value={lane.gain} />
          </Row>
        )}
        {strength && (
          <Row label={t.checkStrength}>{t.checkWin(percent(strength.team), percent(strength.enemy))}</Row>
        )}
        {counters && (
          <Row label={t.checkCounters}>
            {/* Who leads, not by how much: a sum of 25 matchups is not a gap in
                win rate, and printed as a percent it would read like one. */}
            <span className="block">
              {Math.abs(counters.total) < EVEN ? t.checkEven : t.checkLead(counters.total > 0)}
            </span>
            {counters.best && (
              <span className="block text-muted-foreground">
                {counters.best.hero} vs {counters.best.enemy} <Gain value={counters.best.gain} />
              </span>
            )}
            {counters.worst && (
              <span className="block text-muted-foreground">
                {counters.worst.hero} vs {counters.worst.enemy} <Gain value={counters.worst.gain} />
              </span>
            )}
          </Row>
        )}
        {combo && (
          <Row label={t.checkCombo}>
            {combo.a} + {combo.b} <Gain value={combo.gain} />
          </Row>
        )}
        <Row label={t.checkDamage}>
          <span className="block">{t.checkYou}: {split(damage.team)}</span>
          <span className="block">{t.checkEnemy}: {split(damage.enemy)}</span>
        </Row>
      </dl>
    </section>
  );
}
