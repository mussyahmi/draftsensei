// How long ago the numbers were fetched, in the largest unit that fits, so
// it reads "3 hours ago", not "187 minutes ago". Under a minute is "now".
export type Ago = { value: number; unit: 'minute' | 'hour' | 'day' } | 'now';

export function agoFrom(at: number, now: number): Ago {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return { value: minutes, unit: 'minute' };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { value: hours, unit: 'hour' };
  return { value: Math.floor(hours / 24), unit: 'day' };
}

// In the page's language, from the browser's own wording.
export function agoText(ago: Ago, lang: string, justNow: string) {
  if (ago === 'now') return justNow;
  return new Intl.RelativeTimeFormat(lang, { numeric: 'always' }).format(-ago.value, ago.unit);
}
