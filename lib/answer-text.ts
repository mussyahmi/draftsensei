// Gemini answers in markdown however plainly we ask. Rendering it raw put
// literal ** around every hero name, so pull out the two markers it actually
// uses — bold and list bullets — and leave the rest of the text untouched.

export type Span = { text: string; bold: boolean };
export type Line = { bullet: boolean; spans: Span[] };

const BOLD = /\*\*(.+?)\*\*/g;

export function spansOf(line: string): Span[] {
  const spans: Span[] = [];
  let at = 0;
  for (const match of line.matchAll(BOLD)) {
    const start = match.index;
    if (start > at) spans.push({ text: line.slice(at, start), bold: false });
    spans.push({ text: match[1], bold: true });
    at = start + match[0].length;
  }
  if (at < line.length || spans.length === 0) {
    spans.push({ text: line.slice(at), bold: false });
  }
  return spans;
}

export function answerLines(text: string): Line[] {
  return text.split('\n').map((raw) => {
    const bullet = /^\s*[*-]\s+/.test(raw);
    return { bullet, spans: spansOf(bullet ? raw.replace(/^\s*[*-]\s+/, '') : raw) };
  });
}
