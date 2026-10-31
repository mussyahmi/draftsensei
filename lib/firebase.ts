import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// These values are public by design — they ship inside any Firebase web app and
// only name the project. What protects the data is the Firestore rules, which
// let each signed-in account touch its own document and nothing else.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** False when no Firebase project is set up: the app then stays device-only. */
export const firebaseReady = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

export function firebase() {
  if (!firebaseReady) throw new Error('Firebase is not configured.');
  const app = getApps().length
    ? getApp()
    : initializeApp(config as Required<typeof config>);
  return { auth: getAuth(app), db: getFirestore(app) };
}
