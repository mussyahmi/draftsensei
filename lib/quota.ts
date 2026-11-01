// The free Gemini allowance is shared by everyone using the app, since every
// ask goes through the one server key. These are the numbers the header shows.

// Requests a day for gemini-3.5-flash-lite on the free tier.
export const DAILY_LIMIT = 500;

// Google resets the daily quota at midnight Pacific, so that is when our
// count starts over too. en-CA formats as YYYY-MM-DD.
export const quotaDay = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now);

export type Usage = { used: number; limit: number };
