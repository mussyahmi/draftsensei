import { getAuth } from 'firebase-admin/auth';
import { adminApp } from './quota-store';

// The stats page is for whoever runs the app. Their Google email is a server
// setting (OWNER_EMAIL), kept out of the repo like the Gemini key.
export async function isOwner(request: Request): Promise<boolean> {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!owner || !token) return false;
  try {
    const user = await getAuth(adminApp()).verifyIdToken(token);
    return user.email_verified === true && user.email?.toLowerCase() === owner;
  } catch {
    return false;
  }
}
