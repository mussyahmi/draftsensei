// Everything here is pure, so the request shape and the answer parsing are
// testable without spending a call on Google.

export const DEFAULT_MODEL = 'gemini-flash-latest';

// Flash-Lite carries a much larger free daily allowance, so it is what we fall
// back to when the better model's quota is gone for the day.
export const FALLBACK_MODEL = 'gemini-3.5-flash-lite';

export type GeminiPayload = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

export const requestBody = (prompt: string) => ({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
});

export const extractText = (payload: GeminiPayload) =>
  (payload.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('');

export const modelChain = (primary: string, fallback: string) =>
  primary === fallback ? [primary] : [primary, fallback];

// Reasons to give up on one model and try the next rather than fail the draft:
// 429 the daily quota is gone; 403 the key cannot use it; 404 it was retired
// for new keys; 500/503 it is up but buckling under load, which Flash does
// often enough to matter mid-draft.
export const shouldTryNextModel = (status: number) =>
  [403, 404, 429, 500, 503].includes(status);

export const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
