// A rough tally of asks, so a mis-press is visible. It is our own count, not
// Google's — it cannot know the real remaining quota.

export type Usage = { date: string; count: number };

export const today = () => new Date().toISOString().slice(0, 10);

export const countToday = (usage: Usage | null, day: string) =>
  usage && usage.date === day ? usage.count : 0;

export const recordAsk = (usage: Usage | null, day: string): Usage => ({
  date: day,
  count: countToday(usage, day) + 1,
});
