'use client';

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebase, firebaseReady } from './firebase';
import { readSnapshot, type Snapshot } from './sync';

export type Account = { uid: string; email: string | null };

const asAccount = (user: User | null): Account | null =>
  user ? { uid: user.uid, email: user.email } : null;

/** Calls back with the signed-in account, or null. Returns an unsubscribe. */
export function watchAccount(onChange: (account: Account | null) => void) {
  if (!firebaseReady) {
    onChange(null);
    return () => {};
  }
  return onAuthStateChanged(firebase().auth, (user) => onChange(asAccount(user)));
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(firebase().auth, provider);
}

export const signOutOfGoogle = () => signOut(firebase().auth);

const snapshotDoc = (uid: string) => doc(firebase().db, 'drafts', uid);

export async function loadRemote(uid: string): Promise<Snapshot | null> {
  const found = await getDoc(snapshotDoc(uid));
  return found.exists() ? readSnapshot(found.data()) : null;
}

export const saveRemote = (uid: string, snapshot: Snapshot) =>
  setDoc(snapshotDoc(uid), snapshot);

/** Proof of who is signed in, for a server route that checks it. */
export const idToken = () => firebase().auth.currentUser?.getIdToken() ?? Promise.resolve(null);
