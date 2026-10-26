import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

/**
 * Official LUNA ROYALE Firebase Configuration
 * Project name: LUNA ROYALE
 * Project ID: "luna-royale"
 * Project number: "196619131534"
 * App nickname: Luna Royale
 * App ID: "1:196619131534:web:40bcc8ac9041d9c66807df"
 * Firestore Database: "(default)" in africa-south1
 */
export const LUNA_ROYALE_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBXmpgeDtnXx0q_NZBFxKf3u_O5zMNJCkU',
  authDomain: 'luna-royale.firebaseapp.com',
  projectId: 'luna-royale',
  storageBucket: 'luna-royale.firebasestorage.app',
  messagingSenderId: '196619131534',
  appId: '1:196619131534:web:40bcc8ac9041d9c66807df',
  measurementId: 'G-51XDC4W0W9',
} as const;

export const FIRESTORE_DATABASE_ID = '(default)' as const;

const app = getApps().length > 0 ? getApp() : initializeApp(LUNA_ROYALE_FIREBASE_CONFIG);

// Strictly connect to the "(default)" Firestore database on project "luna-royale"
// Uses forced long polling for reliable connectivity in iframe, preview, and restricted network environments
export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      FIRESTORE_DATABASE_ID
    );
  } catch {
    return getFirestore(app, FIRESTORE_DATABASE_ID);
  }
})();

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getUserFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      if (parsed.error.includes('Missing or insufficient permissions')) {
        const op = parsed.operationType ? parsed.operationType.toUpperCase() : 'WRITE';
        const targetPath = parsed.path ? `/${parsed.path}` : 'Firestore';
        const uid = parsed.authInfo?.userId || auth.currentUser?.uid || 'unauthenticated';
        return `Firestore permission denied during ${op} on "${targetPath}" for UID "${uid}". Ensure "/users/${uid}" has "admin: true" in the (default) database and that Firestore rules allow admin writes on "${targetPath}".`;
      }
      if (parsed.error.includes('Quota exceeded')) {
        return 'Database daily quota has been reached. Please try again shortly.';
      }
      return parsed.error || fallback;
    }
  } catch {
    // Not a JSON error string
  }
  if (raw.includes('Missing or insufficient permissions')) {
    const uid = auth.currentUser?.uid || 'unauthenticated';
    return `Firestore permission denied for UID "${uid}". Ensure "/users/${uid}" has "admin: true" in Firestore.`;
  }
  if (raw.includes('offline') || raw.includes('unavailable')) {
    return 'Unable to reach LUNA ROYALE services. Please check your internet connection.';
  }
  return raw || fallback;
}
