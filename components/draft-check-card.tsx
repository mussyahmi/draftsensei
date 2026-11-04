'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
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
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

const groupTitle = 'font-display text-xs uppercase tracking-widest text-muted-foreground';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className={groupTitle}>{title}</h4>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
}

// What the finished draft looks like before the game loads. The picks are
// locked by now, so it says what to expect; it has nothing left to suggest.
export function DraftCheckCard({ team, enemy, me, opponent, rank }: Props) {
  const t = useT();
  const asked = JSON.stringify({ team, enemy, me, opponent, rank });
  const [answer, setAnswer] = useState<{ asked: string; check: DraftCheck } | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);

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
  const { lane, strength, counters, threats, strongest, matchups, combo, partner, damage } = check;
  const split = (s: DraftCheck['damage']['team']) => t.damageSplit(s.physical, s.magic, s.mixed);

  const watchOut = threats.length > 0 || strongest;
  const aboutMe = lane || matchups || partner;

  return (
    <section className="space-y-4 rounded-lg bg-card p-4">
      <div>
        <h3 className="font-display text-sm uppercase tracking-widest text-primary">{t.draftCheck}</h3>
        <p className="text-xs text-muted-foreground">{t.draftCheckHint}</p>
      </div>
      {/* Three across where they fit, so the card takes no scrolling. On a phone
          they stack, and the team numbers wait behind a tap, so the build below
          is not pushed out of reach. */}
      <div className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0 lg:[&>*]:px-6 lg:[&>*]:py-0 lg:[&>*:first-child]:ps-0 lg:[&>*:last-child]:pe-0">
        {watchOut && (
          <Group title={t.checkWatch}>
            {threats.length > 0 && (
              <Row label={t.checkThreat(threats.length)}>
                {threats.map((threat) => (
                  <span key={threat.enemy} className="block">
                    <span className="font-medium">{threat.enemy}</span>{' '}
                    <span className="text-muted-foreground">
                      ({threat.hero} <Gain value={threat.gain} />)
                    </span>
                  </span>
                ))}
              </Row>
            )}
            {strongest && (
              <Row label={t.checkStrongest}>
                {strongest.enemy} <span className="text-muted-foreground">{t.checkWinRate(percent(strongest.win))}</span>
              </Row>
            )}
          </Group>
        )}
        {aboutMe && (
          <Group title={t.checkMe}>
            {lane && (
              <Row label={t.checkLane}>
                {lane.me} vs {lane.enemy} <Gain value={lane.gain} />
              </Row>
            )}
            {matchups && (
              <Row label={t.checkMatchups}>
                {matchups.best && (
                  <span className="block">
                    {t.checkBest(matchups.best.enemy)} <Gain value={matchups.best.gain} />
                  </span>
                )}
                {matchups.worst && (
                  <span className="block">
                    {t.checkWorst(matchups.worst.enemy)} <Gain value={matchups.worst.gain} />
                  </span>
                )}
              </Row>
            )}
            {partner && (
              <Row label={t.checkPartner}>
                {partner.me} + {partner.ally} <Gain value={partner.gain} />
              </Row>
            )}
          </Group>
        )}
        <div className="space-y-3">
          <h4 className={cn(groupTitle, 'hidden lg:block')}>{t.checkTeam}</h4>
          <button
            type="button"
            aria-expanded={teamOpen}
            onClick={() => setTeamOpen((o) => !o)}
            className={cn(groupTitle, 'flex min-h-9 w-full items-center justify-between lg:hidden')}
          >
            {t.checkTeam}
            <ChevronDown className={cn('size-4 transition-transform', teamOpen && 'rotate-180')} />
          </button>
          <dl className={cn('space-y-3 lg:block', teamOpen ? 'block' : 'hidden')}>
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
              <Row label={t.checkPair}>
                {combo.a} + {combo.b} <Gain value={combo.gain} />
              </Row>
            )}
            <Row label={t.checkDamage}>
              <span className="block">
                {t.checkYou}: {split(damage.team)}
              </span>
              <span className="block">
                {t.checkEnemy}: {split(damage.enemy)}
              </span>
            </Row>
          </dl>
        </div>
      </div>
    </section>
  );
}
