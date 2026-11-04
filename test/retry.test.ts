import { test, expect, vi, afterEach } from 'vitest';
import { retryUntil } from '../lib/retry';

afterEach(() => {
  vi.useRealTimers();
});

const settle = async (ms: number) => vi.advanceTimersByTimeAsync(ms);

test('an empty answer is asked again, and a good one stops it', async () => {
  vi.useFakeTimers();
  const answers = [[], [], ['Nana']];
  const load = vi.fn(async () => answers.shift() ?? ['never']);
  const seen: string[][] = [];
  retryUntil<string[]>(load, [], (a) => a.length > 0, (a) => seen.push(a), [100, 100, 100, 100]);
  await settle(1000);
  expect(load).toHaveBeenCalledTimes(3);
  expect(seen.at(-1)).toEqual(['Nana']);
});

test('a failed request counts as empty and is retried', async () => {
  vi.useFakeTimers();
  const load = vi.fn<() => Promise<string[]>>().mockRejectedValueOnce(new Error('down')).mockResolvedValue(['Nana']);
  const seen: string[][] = [];
  retryUntil<string[]>(load, [], (a) => a.length > 0, (a) => seen.push(a), [100]);
  await settle(500);
  expect(seen).toEqual([[], ['Nana']]);
});

test('it gives up when the delays run out', async () => {
  vi.useFakeTimers();
  const load = vi.fn(async () => [] as string[]);
  retryUntil<string[]>(load, [], (a) => a.length > 0, () => {}, [100, 100]);
  await settle(5000);
  expect(load).toHaveBeenCalledTimes(3);
});

test('once stopped it neither asks again nor hands over a late answer', async () => {
  vi.useFakeTimers();
  const load = vi.fn(async () => [] as string[]);
  const onAnswer = vi.fn();
  const stop = retryUntil<string[]>(load, [], (a) => a.length > 0, onAnswer, [100, 100]);
  stop();
  await settle(5000);
  expect(load).toHaveBeenCalledTimes(1);
  expect(onAnswer).not.toHaveBeenCalled();
});
