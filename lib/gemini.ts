// Everything here is pure, so the request shape and the answer parsing are
// testable without spending a call on Google.

// Flash-Lite carries a much larger free daily allowance than Flash, whose
// quota ran out mid-draft often enough that it was not worth trying first.
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

export type GeminiPayload = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

// Search lets Gemini read the current patch instead of recalling items that
// have since been reworked or removed from the shop.
export const requestBody = (prompt: string, search = false) => ({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  ...(search ? { tools: [{ google_search: {} }] } : {}),
  generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
});

export const extractText = (payload: GeminiPayload) =>
  (payload.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('');

export const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Gemini answers in a second or two most days, but under load even a short
// answer has taken over 30 seconds. Wait that long rather than fail, but stay
// inside the 60 second proxy in front of us, search attempt included.
export const MODEL_TIMEOUT_MS = 45_000;

// The search attempt is a bonus: free keys are refused it, so it must not eat
// the time the plain ask needs.
export const SEARCH_TIMEOUT_MS = 8_000;
