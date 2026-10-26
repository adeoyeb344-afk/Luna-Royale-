import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { WishlistItem } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { normalizeTimestamp, sanitizeString } from './firestoreService';

const GUEST_WISHLIST_STORAGE_KEY = 'luna_royale_guest_wishlist_v1';

export function sanitizeWishlistItems(raw: unknown): WishlistItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const list: WishlistItem[] = [];

  for (const entry of raw) {
    if (typeof entry === 'string') {
      const pid = sanitizeString(entry, 128);
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        list.push({ productId: pid, addedAt: new Date().toISOString() });
      }
    } else if (entry && typeof entry === 'object') {
      const rec = entry as Record<string, unknown>;
      const pid = sanitizeString(rec.productId, 128);
      if (pid && !seen.has(pid)) {
        seen.add(pid);
        list.push({
          productId: pid,
          addedAt: normalizeTimestamp(rec.addedAt) || new Date().toISOString(),
        });
      }
    }
  }
  return list;
}

export function loadGuestWishlist(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeWishlistItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveGuestWishlist(items: WishlistItem[]): void {
  try {
    localStorage.setItem(GUEST_WISHLIST_STORAGE_KEY, JSON.stringify(sanitizeWishlistItems(items)));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearGuestWishlist(): void {
  try {
    localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function subscribeToUserWishlist(
  uid: string,
  onData: (items: WishlistItem[]) => void
): () => void {
  const wishRef = doc(db, 'wishlists', uid);
  return onSnapshot(
    wishRef,
    (snap) => {
      if (!snap.exists()) {
        onData([]);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      if (Array.isArray(data.items)) {
        onData(sanitizeWishlistItems(data.items));
      } else if (Array.isArray(data.productIds)) {
        onData(sanitizeWishlistItems(data.productIds));
      } else {
        onData([]);
      }
    },
    () => {
      onData(loadGuestWishlist());
    }
  );
}

export async function saveUserWishlist(uid: string, items: WishlistItem[]): Promise<void> {
  const cleanItems = sanitizeWishlistItems(items);
  const productIds = cleanItems.map((i) => i.productId);
  const path = `wishlists/${uid}`;
  const wishRef = doc(db, 'wishlists', uid);

  try {
    await setDoc(
      wishRef,
      {
        userId: uid,
        productIds,
        items: cleanItems,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function mergeGuestWishlistOnSignIn(uid: string): Promise<void> {
  const guestItems = loadGuestWishlist();
  if (guestItems.length === 0) return;

  try {
    const wishRef = doc(db, 'wishlists', uid);
    const snap = await getDoc(wishRef);
    const existing = snap.exists()
      ? sanitizeWishlistItems(
          (snap.data() as Record<string, unknown>).items ||
            (snap.data() as Record<string, unknown>).productIds
        )
      : [];

    const combined = sanitizeWishlistItems([...existing, ...guestItems]);
    await saveUserWishlist(uid, combined);
    clearGuestWishlist();
  } catch {
    // Keep guest wishlist if merge fails
  }
}
