// The match data source rate-limits for minutes at a time, and a failed answer
// is not kept, so asking again later is what brings suggestions back.

export const RETRY_DELAYS = [5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000];

/**
 * Loads now, then again on a widening delay until an answer is good enough or
 * the delays run out. Each answer is handed over, so a partial one still shows
 * in the meantime. Returns a function that stops it.
 */
export function retryUntil<T>(
  load: () => Promise<T>,
  fallback: T,
  done: (answer: T) => boolean,
  onAnswer: (answer: T) => void,
  delays: number[] = RETRY_DELAYS,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const attempt = (i: number) => {
    load()
      .catch(() => fallback)
      .then((answer) => {
        if (stopped) return;
        onAnswer(answer);
        if (!done(answer) && i < delays.length) timer = setTimeout(() => attempt(i + 1), delays[i]);
      });
  };
  attempt(0);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
