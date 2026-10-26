import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { Order, Review } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { normalizeTimestamp, sanitizeString } from './firestoreService';

export function mapFirestoreReview(
  id: string,
  data: Record<string, unknown>
): Review | null {
  const productId = sanitizeString(data.productId, 128);
  const userId = sanitizeString(data.userId, 128);
  const comment = sanitizeString(data.comment, 2000);
  const rating = typeof data.rating === 'number' ? data.rating : Number(data.rating);

  if (!productId || !userId || !comment) return null;
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  if (data.verifiedPurchase !== true) return null;

  return {
    id,
    productId,
    orderId: sanitizeString(data.orderId, 128) || undefined,
    userId,
    authorName: sanitizeString(data.authorName, 120) || 'Verified Client',
    rating: Math.round(rating),
    comment,
    verifiedPurchase: true,
    createdAt: normalizeTimestamp(data.createdAt),
  };
}

/**
 * Subscribes to verified purchase reviews for a given product.
 * Never returns fake reviews or unverified testimonials.
 */
export function subscribeToProductReviews(
  productId: string,
  onData: (reviews: Review[]) => void
): () => void {
  const q = query(collection(db, 'reviews'), where('productId', '==', productId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Review[] = [];
      snapshot.forEach((docSnap) => {
        const mapped = mapFirestoreReview(
          docSnap.id,
          docSnap.data() as Record<string, unknown>
        );
        if (mapped) list.push(mapped);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(list);
    },
    () => {
      onData([]);
    }
  );
}

/**
 * Checks if the authenticated user has a verified purchase order for a specific product.
 */
export function findVerifiedOrderForProduct(
  userOrders: Order[],
  productId: string
): Order | undefined {
  return userOrders.find(
    (order) =>
      order.status !== 'cancelled' &&
      order.items.some((item) => item.productId === productId)
  );
}

export async function submitVerifiedReview(params: {
  productId: string;
  orderId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const cleanComment = sanitizeString(params.comment, 2000);
  const cleanRating = Math.max(1, Math.min(5, Math.round(params.rating)));

  if (!cleanComment) {
    throw new Error('Please write a review comment.');
  }

  try {
    await addDoc(collection(db, 'reviews'), {
      productId: sanitizeString(params.productId, 128),
      orderId: sanitizeString(params.orderId, 128),
      userId: sanitizeString(params.userId, 128),
      authorName: sanitizeString(params.authorName, 120) || 'Verified Client',
      rating: cleanRating,
      comment: cleanComment,
      verifiedPurchase: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'reviews');
  }
}
