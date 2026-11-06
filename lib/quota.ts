// The free Gemini allowance is shared by everyone using the app, since every
// ask goes through the one server key. These are the numbers the header shows.

// Requests a day for gemini-3.5-flash-lite on the free tier.
export const DAILY_LIMIT = 500;

// Google resets the daily quota at midnight Pacific, so that is when our
// count starts over too. en-CA formats as YYYY-MM-DD.
export const quotaDay = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);

export type Usage = { used: number; limit: number };

// The last few quota days, today first. Stepping back through calendar dates,
// not 24 hours at a time, so a clock change never skips or repeats a day.
export function pastDays(count: number, now = new Date()): string[] {
  const [y, m, d] = quotaDay(now).split('-').map(Number);
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10),
  );
}

// When the quota day next starts over, found by stepping through the hours,
// since midnight Pacific falls on the hour whatever the clocks are doing.
export function nextReset(now = new Date()): Date {
  const today = quotaDay(now);
  const hour = new Date(now);
  hour.setUTCMinutes(0, 0, 0);
  do hour.setUTCHours(hour.getUTCHours() + 1);
  while (quotaDay(hour) === today);
  return hour;
}

// "4 pm" in Malaysia, where the app's owner reads the stats.
export const malaysiaTime = (at: Date) =>
  at.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' })
    .replace(':00', '');
