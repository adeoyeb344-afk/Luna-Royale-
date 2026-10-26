import { SDK_VERSION } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { DeliveryInfo, User } from '../types';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { normalizeTimestamp, sanitizeString } from './firestoreService';

/**
 * Converts a Firestore /users/{uid} document + FirebaseUser into our typed User model.
 * Admin authorization is strictly and dynamically determined from `/users/{uid}.admin == true`.
 * Never determined from email, display name, or hardcoded UIDs.
 * No localStorage, sessionStorage, or client-side fallback is ever used.
 */
export function mapFirestoreUser(
  fbUser: FirebaseUser,
  data: Record<string, unknown> | undefined
): User {
  const isAdmin = Boolean(data && data.admin === true);
  const rawDelivery = data?.deliveryInfo as Record<string, unknown> | undefined;

  const deliveryInfo: DeliveryInfo | null =
    rawDelivery && typeof rawDelivery === 'object'
      ? {
          recipientName: sanitizeString(rawDelivery.recipientName, 160),
          phone: sanitizeString(rawDelivery.phone, 40),
          streetAddress: sanitizeString(rawDelivery.streetAddress, 300),
          city: sanitizeString(rawDelivery.city, 100),
          state: sanitizeString(rawDelivery.state, 100),
          country: sanitizeString(rawDelivery.country, 100) || 'Nigeria',
          deliveryNotes: sanitizeString(rawDelivery.deliveryNotes, 500),
        }
      : null;

  return {
    uid: fbUser.uid,
    email: sanitizeString(data?.email, 256) || fbUser.email || '',
    fullName:
      sanitizeString(data?.fullName, 160) ||
      sanitizeString(data?.displayName, 160) ||
      fbUser.displayName ||
      '',
    phone: sanitizeString(data?.phone, 40) || fbUser.phoneNumber || '',
    admin: isAdmin,
    deliveryInfo,
    createdAt: normalizeTimestamp(data?.createdAt),
    updatedAt: normalizeTimestamp(data?.updatedAt),
  };
}

/**
 * When the authenticated user loads:
 * 1. Get the current Firebase Auth user.
 * 2. Read "/users/{currentUser.uid}" from Firestore.
 * 3. Verify the document exists.
 * 4. Verify "admin === true".
 * 5. Set the application admin state from that verified Firestore value.
 * 6. Preserve the value on refresh and subsequent authentication events.
 *
 * If the document exists, preserves any existing "admin: true" permanently.
 * Does not write "admin: false" as a default, and never downgrades an existing administrator.
 */
export async function syncUserProfileDocument(
  fbUser: FirebaseUser,
  providedFullName?: string
): Promise<User> {
  const userRef = doc(db, 'users', fbUser.uid);

  try {
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const existingData = snap.data() as Record<string, unknown>;

      // 1. If document already contains admin: true, preserve it completely
      if (existingData.admin === true) {
        return mapFirestoreUser(fbUser, existingData);
      }

      // 2. If document exists, do NOT overwrite or downgrade.
      return mapFirestoreUser(fbUser, existingData);
    }

    // 3. Document does not exist yet: create basic profile with merge: true
    // Do NOT write admin: false as a default.
    const newDocData: Record<string, unknown> = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      fullName: sanitizeString(
        providedFullName || fbUser.displayName || '',
        160
      ),
      phone: fbUser.phoneNumber || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, newDocData, { merge: true });
    } catch (err) {
      console.warn('Initial profile create warning:', err);
    }

    try {
      const createdSnap = await getDoc(userRef);
      return mapFirestoreUser(
        fbUser,
        createdSnap.exists()
          ? (createdSnap.data() as Record<string, unknown>)
          : newDocData
      );
    } catch {
      return mapFirestoreUser(fbUser, newDocData);
    }
  } catch (error) {
    console.warn('Profile read warning (offline or connecting):', error);
    return mapFirestoreUser(fbUser, undefined);
  }
}

/**
 * Ensures that the currently authenticated user document in Firestore has `admin: true`.
 * Directly reads `/users/{uid}` from Firestore and verifies "admin === true".
 * If not yet set, establishes `admin: true` with merge and reads back from Firestore to verify.
 * Reports the EXACT Firestore error if verification or writing fails.
 */
export async function ensureAdminVerifiedInFirestore(
  targetUid?: string
): Promise<boolean> {
  const uid = targetUid || auth.currentUser?.uid;
  if (!uid) {
    throw new Error('No authenticated Firebase user found to verify administrator status in Firestore.');
  }

  const userRef = doc(db, 'users', uid);

  // 1. Read document from Firestore
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    console.error(`Error reading /users/${uid}:`, err);
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  // If already exists and has admin === true, verified!
  if (snap.exists() && snap.data()?.admin === true) {
    return true;
  }

  // 2. Document either does not exist or lacks admin: true.
  // Establish admin: true using merge write so all existing fields are preserved.
  const payload: Record<string, unknown> = {
    uid,
    admin: true,
    updatedAt: serverTimestamp(),
  };
  if (auth.currentUser?.email) {
    payload.email = auth.currentUser.email;
  }
  if (auth.currentUser?.displayName) {
    payload.fullName = auth.currentUser.displayName;
  }
  if (auth.currentUser?.phoneNumber) {
    payload.phone = auth.currentUser.phoneNumber;
  }
  if (!snap.exists()) {
    payload.createdAt = serverTimestamp();
  }

  try {
    if (snap.exists()) {
      try {
        await updateDoc(userRef, {
          admin: true,
          updatedAt: serverTimestamp(),
        });
      } catch {
        await setDoc(userRef, payload, { merge: true });
      }
    } else {
      await setDoc(userRef, payload, { merge: true });
    }
  } catch (err) {
    console.error(`Failed to set admin: true on /users/${uid}:`, err);
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  // 3. READ THE DOCUMENT BACK FROM FIRESTORE AND VERIFY admin === true
  let verifySnap;
  try {
    verifySnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  if (!verifySnap.exists()) {
    throw new Error(
      `Firestore document "/users/${uid}" does not exist after writing admin: true.`
    );
  }

  const data = verifySnap.data() as Record<string, unknown>;
  if (data.admin !== true) {
    throw new Error(
      `Firestore document "/users/${uid}" verification failed: expected "admin === true" but found ${JSON.stringify(
        data.admin
      )}.`
    );
  }

  return true;
}

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<User> {
  const cleanName = sanitizeString(fullName, 160);
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (cleanName) {
    await updateProfile(cred.user, { displayName: cleanName });
  }
  return syncUserProfileDocument(cred.user, cleanName);
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return syncUserProfileDocument(cred.user);
}

/**
 * Formats Firebase Authentication errors into clear, actionable messages.
 * When `auth/unauthorized-domain` occurs, reports the exact `window.location.hostname`
 * that must be added to Firebase Console -> Authentication -> Settings -> Authorized domains.
 */
export function formatFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  const currentHost =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : '';

  if (code === 'auth/unauthorized-domain') {
    return currentHost
      ? `Domain "${currentHost}" is not yet authorized in Firebase Authentication for project "luna-royale". Please add "${currentHost}" under Firebase Console → Authentication → Settings → Authorized domains.`
      : 'This domain is not yet authorized in Firebase Authentication for project "luna-royale".';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in provider is not enabled in Firebase Authentication.';
  }
  if (code === 'auth/web-storage-unsupported') {
    return 'Browser storage is required for redirect sign-in. Please allow cookies/storage or open the app in a full browser tab.';
  }
  if (code === 'auth/redirect-cancelled-by-user') {
    return 'Google sign-in redirect was cancelled.';
  }
  if (code === 'auth/redirect-operation-pending') {
    return 'A Google redirect sign-in operation is already in progress.';
  }

  const message = err instanceof Error ? err.message : String(err || '');
  if (message.includes('auth/unauthorized-domain')) {
    return currentHost
      ? `Domain "${currentHost}" is not yet authorized in Firebase Authentication for project "luna-royale". Please add "${currentHost}" under Firebase Console → Authentication → Settings → Authorized domains.`
      : 'This domain is not yet authorized in Firebase Authentication.';
  }

  return 'Authentication could not be completed. Please try again.';
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function createRedirectHandoffId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `lr_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

export function getTopLevelGoogleRedirectHref(handoffId?: string): string {
  if (typeof window === 'undefined') return '/?lr_google_redirect=start';
  const url = new URL(window.location.href);
  url.searchParams.set('lr_google_redirect', 'start');
  if (handoffId) {
    url.searchParams.set('lr_handoff', handoffId);
  }
  return url.toString();
}

export interface AuthCompletionPayload {
  handoffId?: string | null;
  idToken?: string | null;
  accessToken?: string | null;
}

export async function broadcastAuthCompletion(
  payload?: AuthCompletionPayload
): Promise<void> {
  if (typeof window === 'undefined') return;
  const message = {
    type: 'LUNA_ROYALE_AUTH_SUCCESS',
    idToken: payload?.idToken || null,
    accessToken: payload?.accessToken || null,
  };

  if (payload?.handoffId && (payload.idToken || payload.accessToken)) {
    try {
      await fetch('/api/auth/redirect-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoffId: payload.handoffId,
          idToken: payload.idToken || null,
          accessToken: payload.accessToken || null,
        }),
      });
    } catch {
      // Ignore network errors on handoff bridge
    }
  }

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('luna_royale_auth_channel');
      channel.postMessage(message);
      channel.close();
    }
  } catch {
    // Ignore BroadcastChannel errors
  }

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, window.location.origin);
    }
  } catch {
    // Ignore cross-window postMessage errors
  }
}

export async function completeIframeHandoffSignIn(
  idToken?: string | null,
  accessToken?: string | null
): Promise<User | null> {
  if (!idToken && !accessToken) return null;
  const credential = GoogleAuthProvider.credential(
    idToken || null,
    accessToken || undefined
  );
  const result = await signInWithCredential(auth, credential);
  return syncUserProfileDocument(result.user);
}

export async function pollAndCompleteRedirectHandoff(
  handoffId: string,
  maxAttempts = 20,
  intervalMs = 450
): Promise<User | null> {
  if (!handoffId) return null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(
        `/api/auth/redirect-handoff/${encodeURIComponent(handoffId)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.ready && (data.idToken || data.accessToken)) {
          return await completeIframeHandoffSignIn(
            data.idToken,
            data.accessToken
          );
        }
      }
    } catch {
      // Ignore transient network errors
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

let pendingRedirectTab: Window | null = null;
let activeHandoffId: string | null = null;
let isWaitingForExternalRedirect = false;
let resolverConfigured = false;

function buildHandlerRedirectUrl(
  authInstance: any,
  provider: GoogleAuthProvider,
  authType: string,
  redirectUrl: string,
  eventId?: string
): string {
  const config = authInstance.config;
  const handlerBase = `https://${config.authDomain}/__/auth/handler`;
  const params = new URLSearchParams();
  params.set('apiKey', config.apiKey);
  params.set('appName', authInstance.name || '[DEFAULT]');
  params.set('authType', authType);
  params.set('redirectUrl', redirectUrl);
  params.set('v', `X${SDK_VERSION}`);
  if (eventId) {
    params.set('eventId', eventId);
  }
  params.set('providerId', provider.providerId || 'google.com');
  const customParams = provider.getCustomParameters();
  if (customParams && Object.keys(customParams).length > 0) {
    params.set('customParameters', JSON.stringify(customParams));
  }
  const scopes = provider.getScopes().filter((s) => s !== '');
  if (scopes.length > 0) {
    params.set('scopes', scopes.join(','));
  }
  if (authInstance.tenantId) {
    params.set('tid', authInstance.tenantId);
  }
  return `${handlerBase}?${params.toString()}`;
}

export async function ensureAuthRelayReady(): Promise<any> {
  if (typeof window === 'undefined') return null;
  const authInternal = auth as any;
  const resolver = authInternal._popupRedirectResolver;
  if (!resolver || typeof resolver._initialize !== 'function') {
    return null;
  }

  const manager = await resolver._initialize(authInternal);
  if (manager && !manager.__lrPatched) {
    const origOnEvent = manager.onEvent.bind(manager);
    manager.onEvent = (event: any) => {
      if (event && typeof event === 'object') {
        if (
          event.type === 'signInViaPopup_redirect' ||
          event.type === 'signInViaPopup'
        ) {
          event.type = 'signInViaRedirect';
          event.eventId = null;
          isWaitingForExternalRedirect = false;
        } else if (event.type === 'signInViaRedirect') {
          isWaitingForExternalRedirect = false;
        } else if (event.type === 'unknown' && isWaitingForExternalRedirect) {
          return true;
        }
      }
      manager.hasHandledPotentialRedirect = false;
      if (manager.cachedEventUids && typeof manager.cachedEventUids.clear === 'function') {
        manager.cachedEventUids.clear();
      }
      return origOnEvent(event);
    };
    manager.__lrPatched = true;
  }
  return manager;
}

function setupCrossDomainRedirectResolver(): void {
  if (resolverConfigured || typeof window === 'undefined') return;
  const authInternal = auth as any;
  const resolver = authInternal._popupRedirectResolver;
  if (!resolver || typeof resolver._openRedirect !== 'function') return;

  resolverConfigured = true;

  resolver._openRedirect = async function (
    targetAuth: any,
    provider: GoogleAuthProvider,
    _authType: string,
    eventId?: string
  ) {
    await this._originValidation(targetAuth);
    const manager = await ensureAuthRelayReady();

    isWaitingForExternalRedirect = true;
    if (manager) {
      manager.queuedRedirectEvent = null;
      manager.hasHandledPotentialRedirect = false;
    }
    if (typeof this._overrideRedirectResult === 'function') {
      this._overrideRedirectResult(targetAuth, undefined);
    }

    const handoffId = activeHandoffId || createRedirectHandoffId();
    activeHandoffId = handoffId;

    const returnUrl = new URL(
      window.location.origin + window.location.pathname
    );
    returnUrl.searchParams.set('lr_google_redirect', 'return');
    returnUrl.searchParams.set('lr_handoff', handoffId);

    const handlerUrl = buildHandlerRedirectUrl(
      targetAuth,
      provider,
      'signInViaPopup_redirect',
      returnUrl.toString(),
      eventId
    );

    const targetTab = pendingRedirectTab;
    pendingRedirectTab = null;

    if (targetTab && !targetTab.closed) {
      targetTab.location.href = handlerUrl;
      await resolveGoogleRedirectSignIn(handoffId);
      return;
    }

    window.location.href = handlerUrl;
    return new Promise(() => {});
  };
}

setupCrossDomainRedirectResolver();

export async function initiateGoogleRedirectSignIn(
  handoffId?: string
): Promise<void> {
  setupCrossDomainRedirectResolver();
  activeHandoffId = handoffId || createRedirectHandoffId();

  if (typeof window !== 'undefined') {
    try {
      const tab = window.open('about:blank', '_blank');
      if (tab && !tab.closed) {
        pendingRedirectTab = tab;
        try {
          tab.document.write(
            '<!doctype html><html><head><meta charset="utf-8"><title>LUNA ROYALE — Sign In</title></head>' +
              '<body style="margin:0;background:#F8F6EF;color:#0B0B0B;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;">' +
              '<div><p style="font-size:12px;letter-spacing:0.2em;color:#701F36;text-transform:uppercase;margin:0 0 12px;">LUNA ROYALE</p>' +
              '<p style="font-size:15px;letter-spacing:0.05em;margin:0;">Connecting to Google Sign-In...</p></div></body></html>'
          );
          tab.document.close();
        } catch {
          // Ignore document write errors
        }
      }
    } catch {
      pendingRedirectTab = null;
    }
  }

  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (err) {
    isWaitingForExternalRedirect = false;
    if (pendingRedirectTab && !pendingRedirectTab.closed) {
      try {
        pendingRedirectTab.close();
      } catch {
        // Ignore close errors
      }
    }
    pendingRedirectTab = null;
    throw err;
  }
}

export async function resolveGoogleRedirectSignIn(
  handoffId?: string | null
): Promise<User | null> {
  setupCrossDomainRedirectResolver();
  const result = await getRedirectResult(auth);
  if (result && result.user) {
    const oauthCred = GoogleAuthProvider.credentialFromResult(result);
    const profile = await syncUserProfileDocument(result.user);
    await broadcastAuthCompletion({
      handoffId: handoffId || activeHandoffId,
      idToken: oauthCred?.idToken || null,
      accessToken: oauthCred?.accessToken || null,
    });
    return profile;
  }
  return null;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Updates user profile details while STRICTLY PRESERVING any existing `admin: true` field.
 * Never overwrites `admin` with false, undefined, or null.
 */
export async function updateUserProfileDetails(
  uid: string,
  updates: {
    fullName: string;
    phone: string;
    deliveryInfo: DeliveryInfo | null;
  }
): Promise<void> {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  const payload: Record<string, unknown> = {
    fullName: sanitizeString(updates.fullName, 160),
    phone: sanitizeString(updates.phone, 40),
    deliveryInfo: updates.deliveryInfo
      ? {
          recipientName: sanitizeString(updates.deliveryInfo.recipientName, 160),
          phone: sanitizeString(updates.deliveryInfo.phone, 40),
          streetAddress: sanitizeString(updates.deliveryInfo.streetAddress, 300),
          city: sanitizeString(updates.deliveryInfo.city, 100),
          state: sanitizeString(updates.deliveryInfo.state, 100),
          country: sanitizeString(updates.deliveryInfo.country, 100) || 'Nigeria',
          deliveryNotes: sanitizeString(updates.deliveryInfo.deliveryNotes, 500),
        }
      : null,
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(userRef);
    const existingAdmin = snap.exists() && snap.data()?.admin === true;

    if (snap.exists()) {
      await updateDoc(userRef, {
        ...payload,
        ...(existingAdmin ? { admin: true } : {}),
      });
    } else {
      await setDoc(
        userRef,
        {
          uid,
          email: auth.currentUser?.email || '',
          ...payload,
          ...(existingAdmin ? { admin: true } : {}),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to Firebase Auth state and the authenticated user's Firestore `/users/{uid}` document.
 * Firestore is the SINGLE SOURCE OF TRUTH for admin authorization.
 */
export function subscribeToAuthAndProfile(
  onUpdate: (user: User | null, isAuthReady: boolean) => void
): () => void {
  let unsubscribeProfile: (() => void) | null = null;

  const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
    if (unsubscribeProfile) {
      unsubscribeProfile();
      unsubscribeProfile = null;
    }

    if (!fbUser) {
      onUpdate(null, true);
      return;
    }

    // Sync profile and obtain Firestore user data
    const initialUser = await syncUserProfileDocument(fbUser);
    onUpdate(initialUser, true);

    const userRef = doc(db, 'users', fbUser.uid);
    unsubscribeProfile = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          onUpdate(mapFirestoreUser(fbUser, data), true);
        } else {
          onUpdate(initialUser, true);
        }
      },
      () => {
        onUpdate(initialUser, true);
      }
    );
  });

  return () => {
    if (unsubscribeProfile) unsubscribeProfile();
    unsubscribeAuth();
  };
}
