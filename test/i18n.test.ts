import { test, expect } from 'vitest';
import { STRINGS, langFor } from '../lib/i18n';
import { buildPrompt, newDraft, pickPrompt } from '../lib/draft';
import { pickReason } from '../lib/matchups';
import { banReason } from '../lib/bans';

test('a phone set to Malay starts in Malay, anything else in English', () => {
  expect(langFor('ms-MY')).toBe('ms');
  expect(langFor('ms')).toBe('ms');
  expect(langFor('en-US')).toBe('en');
  expect(langFor(undefined)).toBe('en');
});

test('Malay has a word for everything English has', () => {
  const missing = Object.entries(STRINGS.ms).filter(([, v]) => v === '' || v == null).map(([k]) => k);
  expect(missing).toEqual([]);
  expect(Object.keys(STRINGS.ms).sort()).toEqual(Object.keys(STRINGS.en).sort());
});

test('no long dashes in either language', () => {
  const all = JSON.stringify(STRINGS) + STRINGS.en.howToTip + STRINGS.ms.howToTip;
  expect(all).not.toMatch(/[–—]/);
});

test('with Malay on, Gemini is asked to answer in Malay and keep game names in English', () => {
  const draft = { ...newDraft(), lang: 'ms' as const, myHero: 'Nana' };
  expect(pickPrompt(draft)).toContain('formal Malay');
  const build = buildPrompt(draft);
  expect(build).toContain('Bantu dahulu:, Ult pada:, Syarat menang:');
  expect(build).toContain('the labels Battle spell: and Emblem: as written');
  expect(buildPrompt({ ...draft, lang: 'en' })).not.toContain('Malay');
});

test('chip reasons read in Malay', () => {
  const r = { hero: 'Aurora', against: 0.01, alongside: 0.036, best: { enemy: 'Layla', gain: 0.012 }, partner: { ally: 'Kaja', gain: 0.036 } };
  expect(pickReason(r, STRINGS.ms.reasonWords)).toBe('+1.2% menang vs Layla, +3.6% bersama Kaja');
  expect(banReason({ hero: 'Masha', win: 0.61, ban: 0.39 }, STRINGS.ms.banReason)).toBe('61% menang, 39% disekat');
});
