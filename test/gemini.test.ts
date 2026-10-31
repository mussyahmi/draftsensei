import { test, expect } from 'vitest';
import { requestBody, extractText, modelChain, shouldTryNextModel } from '../lib/gemini';

test('request body carries the prompt as the only user part', () => {
  expect(requestBody('suggest mid lane hero')).toEqual({
    contents: [{ role: 'user', parts: [{ text: 'suggest mid lane hero' }] }],
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

test('the model chain tries the good model first, then the high-quota one', () => {
  expect(modelChain('gemini-flash-latest', 'gemini-3.5-flash-lite'))
    .toEqual(['gemini-flash-latest', 'gemini-3.5-flash-lite']);
});

test('the model chain never repeats a model', () => {
  expect(modelChain('gemini-3.5-flash-lite', 'gemini-3.5-flash-lite'))
    .toEqual(['gemini-3.5-flash-lite']);
});

test('a model that is out of quota or unreachable sends us to the next one', () => {
  expect(shouldTryNextModel(429)).toBe(true); // daily quota gone
  expect(shouldTryNextModel(403)).toBe(true); // key cannot use it
  expect(shouldTryNextModel(404)).toBe(true); // retired for new keys
});

test('a model buckling under load sends us to the next one too', () => {
  // Flash answers 503 "experiencing high demand" often enough that failing
  // outright would strand a draft mid-pick.
  expect(shouldTryNextModel(503)).toBe(true);
  expect(shouldTryNextModel(500)).toBe(true);
});

test('anything else is a real answer or a real error, so we stop', () => {
  expect(shouldTryNextModel(200)).toBe(false);
  expect(shouldTryNextModel(400)).toBe(false);
  expect(shouldTryNextModel(401)).toBe(false);
});
