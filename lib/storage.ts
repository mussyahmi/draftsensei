import { newDraft, newPool, type Draft, type Pool } from './draft';

const DRAFT_KEY = 'ml-draft-helper';
const POOL_KEY = 'ml-draft-helper-pool';

// Private browsing throws on both read and write. The app still works there; it
// just forgets everything on reload.
const read = <T>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') as T | null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* nothing to do — the draft lives in memory for this session */
  }
};

export type Saved = { draft: Draft; updatedAt: number };

export const loadDraft = (): Saved => {
  const saved = read<Saved>(DRAFT_KEY);
  return saved?.draft?.picks
    ? {
        draft: { ...newDraft(), ...saved.draft },
        updatedAt: saved.updatedAt ?? 0,
      }
    : { draft: newDraft(), updatedAt: 0 };
};

export const saveDraft = (saved: Saved) => write(DRAFT_KEY, saved);

export const loadPool = (): Pool => ({ ...newPool(), ...(read<Pool>(POOL_KEY) ?? {}) });

export const savePool = (pool: Pool) => write(POOL_KEY, pool);
