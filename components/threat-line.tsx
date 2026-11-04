'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/lang';
import type { Rank } from '@/lib/draft';
import type { Threat } from '@/lib/threat';

// Who to plan around while picks are still open. A short wait lets a burst of
// edits settle, and a late answer for an older board is dropped.
export function ThreatLine({ team, enemy, rank }: { team: string[]; enemy: string[]; rank: Rank }) {
  const t = useT();
  const asked = JSON.stringify({ team, enemy, rank });
  const [answer, setAnswer] = useState<{ asked: string; threats: Threat[] } | null>(null);

  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      fetch('/api/threat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: asked })
        .then((r) => (r.ok ? r.json() : []))
        .then((threats: Threat[]) => {
          if (current) setAnswer({ asked, threats });
        })
        .catch(() => {
          /* no line; the picks themselves are unaffected */
        });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [asked]);

  const threats = answer?.asked === asked ? answer.threats : [];
  if (!threats.length) return null;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{t.checkThreat(threats.length)}: </span>
      {threats.map((threat, i) => (
        <span key={threat.enemy}>
          {i > 0 && ', '}
          <span className="font-medium">{threat.enemy}</span>{' '}
          <span className="text-muted-foreground">
            ({threat.hero} <span className="tabular-nums text-red-400">-{(Math.abs(threat.gain) * 100).toFixed(1)}%</span>)
          </span>
        </span>
      ))}
    </p>
  );
}
