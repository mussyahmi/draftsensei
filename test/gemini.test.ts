import { test, expect } from 'vitest';
import { requestBody, extractText } from '../lib/gemini';

test('request body carries the prompt as the only user part', () => {
  expect(requestBody('suggest mid lane hero')).toEqual({
    contents: [{ role: 'user', parts: [{ text: 'suggest mid lane hero' }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
  });
});

test('a searched request lets Gemini look things up on Google', () => {
  expect(requestBody('suggest a build', true)).toEqual({
    contents: [{ role: 'user', parts: [{ text: 'suggest a build' }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
  });
});

test('extracts the answer text from a normal response', () => {
  const payload = {
    candidates: [{ content: { parts: [{ text: 'Kagura — strong burst' }] } }],
  };
  expect(extractText(payload)).toBe('Kagura — strong burst');
});

test('joins an answer that came back split across parts', () => {
  const payload = {
    candidates: [{ content: { parts: [{ text: 'Kagura' }, { text: ' — strong burst' }] } }],
  };
  expect(extractText(payload)).toBe('Kagura — strong burst');
});

test('an answer with no candidates reads as empty', () => {
  expect(extractText({})).toBe('');
  expect(extractText({ candidates: [] })).toBe('');
});
