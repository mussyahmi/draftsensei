import { newDraft, newPool, type Draft, type Pool } from './draft';

// What one account keeps in the cloud: the draft in progress and the hero pool,
// with the time it was written so two devices can agree on which is current.
export type Snapshot = {
  draft: Draft;
  pool: Pool;
  updatedAt: number;
};

export const newer = (local: Snapshot | null, remote: Snapshot | null) => {
  if (!local) return remote;
  if (!remote) return local;
  // A tie keeps this device's copy: it is the one in front of you.
  return remote.updatedAt > local.updatedAt ? remote : local;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Written by a browser, read by a browser, and possibly by an older version of
// this app, so fill in anything missing rather than trusting the shape.
export const readSnapshot = (value: unknown): Snapshot | null => {
  if (!isRecord(value)) return null;
  if (!isRecord(value.draft)) return null;

  const pool = isRecord(value.pool) ? value.pool : {};

  return {
    draft: { ...newDraft(), ...(value.draft as Partial<Draft>) },
    pool: { ...newPool(), ...(pool as Partial<Pool>) },
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
  };
};
