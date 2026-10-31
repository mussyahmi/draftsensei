import { test, expect } from 'vitest';
import { answerLines } from '../lib/answer-text';

test('bold markers become bold spans, not literal asterisks', () => {
  expect(answerLines('**Kagura** — long range poke')).toEqual([
    {
      bullet: false,
      spans: [
        { text: 'Kagura', bold: true },
        { text: ' — long range poke', bold: false },
      ],
    },
  ]);
});

test('a leading markdown bullet becomes a bullet line without its marker', () => {
  expect(answerLines('* Lunox — burst through tanks')).toEqual([
    { bullet: true, spans: [{ text: 'Lunox — burst through tanks', bold: false }] },
  ]);
  expect(answerLines('- Lunox')).toEqual([
    { bullet: true, spans: [{ text: 'Lunox', bold: false }] },
  ]);
});

test('a lone asterisk inside a line is left alone', () => {
  expect(answerLines('5 * 2 damage')).toEqual([
    { bullet: false, spans: [{ text: '5 * 2 damage', bold: false }] },
  ]);
});

test('every line is kept, blank ones included', () => {
  expect(answerLines('one\n\ntwo').map((l) => l.spans[0].text)).toEqual(['one', '', 'two']);
});
