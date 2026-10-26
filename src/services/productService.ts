import {
  collection,
  onSnapshot,
} from 'firebase/firestore';
import {
  Box,
  Collection,
  OFFICIAL_BOXES,
  OFFICIAL_COLLECTIONS,
  Product,
  ProductAvailability,
} from '../types';
import { db } from './firebase';
import {
  isOfficialCategory,
  normalizeTimestamp,
  sanitizeString,
} from './firestoreService';

/**
 * Safely maps a Firestore document from `/products/{productId}` into a typed `Product`.
 * Returns null if required fields are missing or invalid so undefined/null/NaN values
 * are never displayed.
 */
export function mapFirestoreProduct(
  id: string,
  data: Record<string, unknown>
): Product | null {
  if (!id || id === '_connection_probe_') return null;

  let name = sanitizeString(data.name, 200);
  if (!name) return null;
  if (name.toLowerCase() === 'floral charm necklace and earrings set') {
    name = 'Floral Charm Necklace & Earrings Set';
  }

  const rawCategory = data.category;
  if (!isOfficialCategory(rawCategory)) return null;

  const numericPrice = typeof data.price === 'number' ? data.price : Number(data.price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) return null;

  let availability: ProductAvailability = 'in_stock';
  if (
    data.availability === 'in_stock' ||
    data.availability === 'out_of_stock' ||
    data.availability === 'limited'
  ) {
    availability = data.availability;
  } else if (data.inStock === false || data.available === false) {
    availability = 'out_of_stock';
  }

  const rawImages = Array.isArray(data.images) ? data.images : [];
  const images = rawImages
    .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
    .map((img) => img.trim());

  const rawCollections = Array.isArray(data.collectionIds)
    ? data.collectionIds
    : Array.isArray(data.collections)
      ? data.collections
      : [];
  const collectionIds = rawCollections
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim());

  const rawBoxes = Array.isArray(data.boxIds)
    ? data.boxIds
    : Array.isArray(data.boxes)
      ? data.boxes
      : [];
  const boxIds = rawBoxes
    .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    .map((b) => b.trim());

  const published =
    typeof data.published === 'boolean'
      ? data.published
      : typeof data.isPublished === 'boolean'
        ? data.isPublished
        : true;

  return {
    id,
    name,
    category: rawCategory,
    description: sanitizeString(data.description, 4000),
    price: numericPrice,
    currency: 'NGN',
    availability,
    images,
    published,
    collectionIds,
    boxIds,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}

/**
 * Subscribes to `/products` collection in Firestore.
 * Never seeds or returns fictional products.
 */
export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError: (error: unknown) => void
): () => void {
  const productsRef = collection(db, 'products');
  return onSnapshot(
    productsRef,
    (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((docSnap) => {
        const mapped = mapFirestoreProduct(
          docSnap.id,
          docSnap.data() as Record<string, unknown>
        );
        if (mapped) {
          list.push(mapped);
        }
      });
      // Sort newest first when createdAt exists, otherwise alphabetical by name
      list.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.localeCompare(a.createdAt);
        }
        return a.name.localeCompare(b.name);
      });
      onData(list);
    },
    (err) => {
      onError(err);
    }
  );
}

/**
 * Subscribes to `/collections` collection in Firestore and merges with the
 * 6 official LUNA ROYALE collection structures.
 * Collections remain empty until real products are associated by an administrator.
 */
export function subscribeToCollections(
  onData: (collections: Collection[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const collectionsRef = collection(db, 'collections');
  return onSnapshot(
    collectionsRef,
    (snapshot) => {
      const firestoreMap = new Map<string, Partial<Collection>>();
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        const productIds = Array.isArray(d.productIds)
          ? d.productIds.filter((id): id is string => typeof id === 'string')
          : [];
        firestoreMap.set(docSnap.id, {
          id: docSnap.id,
          name: sanitizeString(d.name, 160) || undefined,
          description: sanitizeString(d.description, 1000) || undefined,
          productIds,
          published: typeof d.published === 'boolean' ? d.published : true,
          updatedAt: normalizeTimestamp(d.updatedAt),
        });
      });

      const merged: Collection[] = OFFICIAL_COLLECTIONS.map((official) => {
        const remote = firestoreMap.get(official.id);
        return {
          id: official.id,
          name: official.name,
          description: remote?.description || official.description,
          productIds: remote?.productIds || [],
          published: remote?.published ?? true,
          updatedAt: remote?.updatedAt,
        };
      });

      onData(merged);
    },
    (err) => {
      // If collections read is restricted or empty, still provide the 6 official empty collection structures
      onData(OFFICIAL_COLLECTIONS);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to `/boxes` collection in Firestore and merges with the
 * 5 official LUNA ROYALE Boxes & Sets structures.
 * Only displays a box/set as publicly purchasable when real products AND a real price (> 0)
 * have been configured by an administrator.
 */
export function subscribeToBoxes(
  onData: (boxes: Box[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const boxesRef = collection(db, 'boxes');
  return onSnapshot(
    boxesRef,
    (snapshot) => {
      const firestoreMap = new Map<string, Partial<Box>>();
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        const productIds = Array.isArray(d.productIds)
          ? d.productIds.filter((id): id is string => typeof id === 'string')
          : [];
        const rawPrice = typeof d.price === 'number' ? d.price : Number(d.price);
        const validPrice =
          d.price !== null &&
          d.price !== undefined &&
          d.price !== '' &&
          Number.isFinite(rawPrice) &&
          rawPrice > 0
            ? rawPrice
            : null;
        const images = Array.isArray(d.images)
          ? d.images.filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
          : [];

        firestoreMap.set(docSnap.id, {
          id: docSnap.id,
          name: sanitizeString(d.name, 160) || undefined,
          composition: sanitizeString(d.composition, 500) || undefined,
          description: sanitizeString(d.description, 2000) || undefined,
          productIds,
          price: validPrice,
          currency: 'NGN',
          published: Boolean(d.published === true),
          images,
          updatedAt: normalizeTimestamp(d.updatedAt),
        });
      });

      const merged: Box[] = OFFICIAL_BOXES.map((official) => {
        const remote = firestoreMap.get(official.id);
        return {
          id: official.id,
          name: official.name,
          composition: official.composition,
          description: remote?.description || official.description,
          productIds: remote?.productIds || [],
          price: remote?.price ?? null,
          currency: 'NGN',
          published: remote?.published ?? false,
          images: remote?.images || [],
          updatedAt: remote?.updatedAt,
        };
      });

      onData(merged);
    },
    (err) => {
      onData(OFFICIAL_BOXES);
      if (onError) onError(err);
    }
  );
}

/**
 * Checks whether a Box/Set is fully configured with real published products and a real price > 0.
 */
export function isBoxPubliclyAvailable(box: Box, publishedProducts: Product[]): boolean {
  if (!box.published) return false;
  if (typeof box.price !== 'number' || !Number.isFinite(box.price) || box.price <= 0) {
    return false;
  }
  const associatedRealProducts = publishedProducts.filter(
    (p) => box.productIds.includes(p.id) || p.boxIds.includes(box.id)
  );
  return associatedRealProducts.length > 0;
}
