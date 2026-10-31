'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Answer = { text: string; prompt: string; model: string };

type Props = {
  prompt: string;
  answer: Answer | null;
  loading: boolean;
  error: string | null;
  asksToday: number;
  onAsk: () => void;
};

export function AnswerBar({ prompt, answer, loading, error, asksToday, onAsk }: Props) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

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
    <footer className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 py-3">
        {error && (
          <p className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {answer && !error && (
          <div className={cn('mb-3', stale && 'opacity-45')}>
            {stale && (
              <p className="mb-1 font-display text-xs uppercase tracking-wider text-primary">
                Picks changed — ask again
              </p>
            )}
            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-snug sm:text-base">
              {answer.text}
            </pre>
          </div>
        )}

        {!answer && !error && !loading && (
          <p className="mb-3 text-sm text-muted-foreground">
            Type the picks, then ask. Answers land here.
          </p>
        )}

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
            {loading ? 'Asking…' : stale || answer ? 'Ask again' : 'Ask'}
          </Button>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            ⌘↵
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPrompt((s) => !s)}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {showPrompt ? 'Hide prompt' : 'Show prompt'}
          </Button>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {asksToday} {asksToday === 1 ? 'ask' : 'asks'} today
            {answer && !stale && ` · ${answer.model}`}
          </span>
        </div>

        {showPrompt && (
          <div className="mt-2 space-y-2 border-t border-border pt-2">
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
    </footer>
  );
}
