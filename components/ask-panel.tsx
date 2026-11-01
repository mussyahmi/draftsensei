'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { answerLines, type Line } from '@/lib/answer-text';
import { buildBlocks, heroOf, itemOf, type Block } from '@/lib/icons';
import { HEROES } from '@/lib/heroes';
import { GameImage } from '@/components/game-image';

export type Answer = {
  text: string;
  prompt: string;
  model: string;
  searched: boolean;
  build: boolean;
};

function TextLine({ line, icon }: { line: Line; icon: string | null }) {
  return (
    <p
      className={cn(
        'whitespace-pre-wrap',
        icon ? 'flex items-center gap-2 py-0.5' : line.bullet && 'pl-4 -indent-4',
      )}
    >
      <span>
        {line.bullet && !icon && <span className="text-primary">• </span>}
        {line.spans.map((span, j) =>
          span.bold ? (
            <strong key={j} className="font-semibold text-primary">
              {span.text}
            </strong>
          ) : (
            <span key={j}>{span.text}</span>
          ),
        )}
      </span>
      {icon && <GameImage src={icon} className="size-7" />}
    </p>
  );
}

type Props = {
  // What the button says before the first answer, e.g. "Suggest heroes".
  label: string;
  prompt: string;
  answer: Answer | null;
  loading: boolean;
  error: string | null;
  // Every hero's portrait by name, for the lines of a pick answer.
  portraits: Record<string, string | null>;
  onAsk: () => void;
};

// One phase's ask button with its answer underneath. The page has two: hero
// picks, then my build.
export function AskPanel({ label, prompt, answer, loading, error, portraits, onAsk }: Props) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  // Folding the answer away frees the screen for editing picks. A fresh
  // answer opens it again, since that is what the player just asked for.
  const [collapsed, setCollapsed] = useState(false);
  const [shownAnswer, setShownAnswer] = useState(answer);
  if (answer !== shownAnswer) {
    setShownAnswer(answer);
    setCollapsed(false);
  }

  // A build answer lists a spell and items, one per line; each gets its icon.
  // A pick answer's hero lines get the hero's portrait instead.
  const items = useMemo(
    () => (answer?.build ? answer.text.split('\n').map(itemOf) : []),
    [answer],
  );
  const heroes = useMemo(
    () => (answer && !answer.build ? answer.text.split('\n').map((l) => heroOf(l, HEROES)) : []),
    [answer],
  );
  const [icons, setIcons] = useState<Record<string, string | null>>({});
  useEffect(() => {
    const names = [...new Set(items.filter((n): n is string => n !== null))];
    if (!names.length) return;
    const controller = new AbortController();
    fetch(`/api/icons?${names.map((n) => `n=${encodeURIComponent(n)}`).join('&')}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((found: Record<string, string | null>) => setIcons((had) => ({ ...had, ...found })))
      .catch(() => {
        /* no icons, the names still read fine */
      });
    return () => controller.abort();
  }, [items]);

  const lines = useMemo(() => (answer ? answerLines(answer.text) : []), [answer]);
  const blocks = useMemo<Block[]>(
    () =>
      answer?.build ? buildBlocks(answer.text) : lines.map((_, i) => ({ line: i })),
    [answer, lines],
  );

  // The answer was computed from a prompt. If the prompt has moved on, the
  // answer is about a board that no longer exists.
  const stale = answer !== null && answer.prompt !== prompt;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the text is on screen to select by hand */
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={onAsk}
          disabled={loading}
          size="lg"
          className="flex-1 font-display text-base uppercase tracking-wide"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {loading ? 'Asking…' : answer ? 'Ask again' : label}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowPrompt(!showPrompt || collapsed);
            setCollapsed(false);
          }}
          className="shrink-0 text-xs text-muted-foreground"
        >
          {showPrompt && !collapsed ? 'Hide prompt' : 'Show prompt'}
        </Button>
      </div>

      {answer && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {!stale && answer.model}
            {!stale && answer.searched && ' · searched Google'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((c) => !c)}
            className="h-6 shrink-0 px-2 text-xs text-muted-foreground"
          >
            {collapsed ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {collapsed ? 'Show answer' : 'Minimize'}
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {answer && !error && !collapsed && (
        <div
          className={cn(
            'rounded-lg border border-border bg-card/60 p-3',
            stale && 'opacity-45',
          )}
        >
          {stale && (
            <p className="mb-1 font-display text-xs uppercase tracking-wider text-primary">
              Picks changed, ask again
            </p>
          )}
          <div className="space-y-0.5 text-base leading-snug">
            {blocks.map((block, b) =>
              'items' in block ? (
                // The six items side by side in buying order, name under icon.
                <ol key={b} className="grid max-w-lg grid-cols-6 gap-2 py-1.5">
                  {block.items.map((name, k) => (
                    <li key={k} className="flex flex-col items-center gap-1 text-center">
                      {icons[name] ? (
                        <GameImage src={icons[name]} className="size-10 sm:size-12" />
                      ) : (
                        <span className="grid size-10 place-items-center rounded-md bg-muted text-xs text-muted-foreground sm:size-12">
                          {k + 1}
                        </span>
                      )}
                      <span className="text-xs leading-tight">{name}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <TextLine
                  key={b}
                  line={lines[block.line]}
                  icon={
                    (items[block.line] && icons[items[block.line]!]) ||
                    (heroes[block.line] && portraits[heroes[block.line]!]) ||
                    null
                  }
                />
              ),
            )}
          </div>
        </div>
      )}

      {showPrompt && !collapsed && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {prompt}
          </pre>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy prompt'}
          </Button>
        </div>
      )}
    </div>
  );
}
