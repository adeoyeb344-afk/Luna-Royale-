import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { CartItem } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { sanitizeString } from './firestoreService';

const GUEST_CART_STORAGE_KEY = 'luna_royale_guest_cart_v1';

export function sanitizeCartItems(rawItems: unknown): CartItem[] {
  if (!Array.isArray(rawItems)) return [];
  const valid: CartItem[] = [];
  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const productId = sanitizeString(rec.productId || rec.id, 128);
    const name = sanitizeString(rec.name || rec.title, 200);
    const price = typeof rec.price === 'number' ? rec.price : Number(rec.price);
    const quantity = typeof rec.quantity === 'number' ? Math.floor(rec.quantity) : Number(rec.quantity);

    if (!productId || !name || !Number.isFinite(price) || price < 0) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    valid.push({
      productId,
      itemType: rec.itemType === 'box' ? 'box' : 'product',
      name,
      categoryLabel: sanitizeString(rec.categoryLabel, 80) || 'Curated Piece',
      price,
      currency: 'NGN',
      quantity: Math.min(quantity, 99),
      image: typeof rec.image === 'string' && rec.image.trim().length > 0 ? rec.image.trim() : null,
    });
  }
  return valid;
}

export function loadGuestCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveGuestCart(items: CartItem[]): void {
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(sanitizeCartItems(items)));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearGuestCart(): void {
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Calculates exact cart subtotal in NGN (₦).
 * Never invents shipping fees, taxes, or additional charges.
 */
export function calculateCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const lineTotal = item.price * item.quantity;
    return Number.isFinite(lineTotal) && lineTotal >= 0 ? sum + lineTotal : sum;
  }, 0);
}

export function subscribeToUserCart(
  uid: string,
  onData: (items: CartItem[]) => void
): () => void {
  const cartRef = doc(db, 'carts', uid);
  return onSnapshot(
    cartRef,
    (snap) => {
      if (!snap.exists()) {
        onData([]);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      onData(sanitizeCartItems(data.items));
    },
    () => {
      onData(loadGuestCart());
    }
  );
}

export async function saveUserCart(uid: string, items: CartItem[]): Promise<void> {
  const cleanItems = sanitizeCartItems(items);
  const path = `carts/${uid}`;
  const cartRef = doc(db, 'carts', uid);

  try {
    await setDoc(
      cartRef,
      {
        userId: uid,
        items: cleanItems,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function mergeGuestCartOnSignIn(uid: string): Promise<void> {
  const guestItems = loadGuestCart();
  if (guestItems.length === 0) return;

  try {
    const cartRef = doc(db, 'carts', uid);
    const snap = await getDoc(cartRef);
    const existingItems = snap.exists()
      ? sanitizeCartItems((snap.data() as Record<string, unknown>).items)
      : [];

    const mergedMap = new Map<string, CartItem>();
    for (const item of existingItems) {
      mergedMap.set(item.productId, { ...item });
    }
    for (const gItem of guestItems) {
      const existing = mergedMap.get(gItem.productId);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + gItem.quantity);
      } else {
        mergedMap.set(gItem.productId, { ...gItem });
      }
    }

    await saveUserCart(uid, Array.from(mergedMap.values()));
    clearGuestCart();
  } catch {
    // Keep guest cart intact if merge fails
  }
}
