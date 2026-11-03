// Picks out which item or battle spell a line of a build answer is about, so
// the answer bar can put its icon beside it.

// Gemini tags each item with core or situational after a bracket or a colon;
// the name is whatever comes before. A dash stays, because the shop writes a
// blessed boots as "Tough Boots - Encourage".
const nameOf = (text: string) => {
  const name = text.replace(/\*\*/g, '').split(/\s*[(:]/)[0].trim();
  return name || null;
};

// Gemini sometimes puts a markdown bullet in front of the number too.
const itemLine = (line: string) => line.match(/^\s*(?:[*-]\s+)?\d+[.)]\s+(.+)$/);

export function itemOf(line: string): string | null {
  const spell = line.match(/battle spell\W*?:\**\s*(.+)$/i);
  if (spell) return nameOf(spell[1]);
  const emblem = line.match(/emblem\W*?:\**\s*(.+)$/i);
  // Gemini sometimes writes "Tank Emblem", while the icons go by "Tank".
  if (emblem) return nameOf(emblem[1])?.replace(/\s+emblem$/i, '') ?? null;
  const item = itemLine(line);
  if (item) return nameOf(item[1]);
  // Gemini sometimes writes the spell as a bare bullet, "- Flicker". Any
  // bulleted line is worth a lookup; one that names no item or spell, like an
  // advice line, simply finds no icon.
  const bullet = line.match(/^\s*[*-]\s+(.+)$/);
  return bullet ? nameOf(bullet[1]) : null;
}

// Which hero a line of a pick answer is about: one whose name the line opens
// with, once any number, bullet or bold markers are out of the way. A reason
// that mentions a hero further in is not about that hero.
export function heroOf(line: string, heroes: string[]): string | null {
  const text = line.replace(/\*\*/g, '').replace(/^\s*(?:[*-]\s+)?(?:\d+[.)]\s+)?/, '').toLowerCase();
  let found: string | null = null;
  for (const hero of heroes) {
    const name = hero.toLowerCase();
    // The name must end where a word does, so Sun does not match Sunny, and
    // the longest match wins, so Yi Sun-shin is not read as Yi.
    if (text.startsWith(name) && !/[a-z0-9]/.test(text.charAt(name.length))) {
      if (!found || hero.length > found.length) found = hero;
    }
  }
  return found;
}

// The build reads best as one row of items in buying order, with the spell
// and the advice lines around it left as text.
export type Block = { line: number } | { items: string[] };

export function buildBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  text.split('\n').forEach((line, i) => {
    const item = itemLine(line) && itemOf(line);
    if (!item) return void blocks.push({ line: i });
    const last = blocks.at(-1);
    if (last && 'items' in last) last.items.push(item);
    else blocks.push({ items: [item] });
  });
  return blocks;
}

// A pick answer as chips: each line that opens with a hero, and the reason
// written after it. Lines about no hero, like a preamble, are dropped.
export function picksOf(text: string, heroes: string[]): { hero: string; reason: string }[] {
  const seen = new Set<string>();
  const picks: { hero: string; reason: string }[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const clean = line.replace(/\*\*/g, '').replace(/^\s*(?:[*-]\s+)?(?:\d+[.)]\s+)?/, '').trim();
    const hero = heroOf(line, heroes);
    const rest = hero ? clean.slice(hero.length) : '';
    const last = picks[picks.length - 1];
    // Gemini sometimes puts a reason on the line under the name. That line may
    // open with an enemy's name, which only a separator would make a new pick.
    if (last && !last.reason && (!hero || (rest.trim() && !/^\s*[:\-\u2013\u2014]/.test(rest)))) {
      last.reason = clean;
      continue;
    }
    if (!hero || seen.has(hero)) continue;
    seen.add(hero);
    picks.push({ hero, reason: rest.replace(/^\s*[:\-\u2013\u2014]\s*/, '').trim() });
  }
  return picks;
}
