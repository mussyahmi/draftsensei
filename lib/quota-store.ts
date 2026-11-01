import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { quotaDay } from './quota';

// The shared ask count lives in Firestore, one document per quota day, so
// every server instance and every visitor sees the same number. Only the
// server writes it, through the admin SDK; the rules give browsers no access.
// Credentials come from the environment: the App Hosting service account in
// production, `gcloud auth application-default login` on a laptop.

const db = () =>
  getFirestore(
    getApps()[0] ?? initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }),
  );

const doc = (now: Date) => db().doc(`usage/${quotaDay(now)}`);

// The count is a nice-to-have. A slow or unreachable Firestore must never hold
// up an answer, so give up quickly and report no number.
const quickly = <T>(work: Promise<T>): Promise<T | null> =>
  Promise.race([
    work,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2_500)),
  ]).catch(() => null);

export const asksToday = (now = new Date()) =>
  quickly(doc(now).get().then((snap) => (snap.get('count') as number | undefined) ?? 0));

export const countAsk = (now = new Date()) =>
  quickly(
    (async () => {
      const ref = doc(now);
      await ref.set({ count: FieldValue.increment(1) }, { merge: true });
      return ((await ref.get()).get('count') as number | undefined) ?? null;
    })(),
  );
