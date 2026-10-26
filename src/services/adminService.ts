import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Box,
  Collection,
  OfficialCategory,
  ProductAvailability,
  User,
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ensureAdminVerifiedInFirestore } from './authService';
import { isOfficialCategory, sanitizeString } from './firestoreService';

/**
 * Dynamic admin authorization helper.
 * Strictly checks `/users/{uid}.admin === true` loaded from Firestore.
 * Never checks email, displayName, or hardcoded UID lists.
 */
export function isUserAdmin(user: User | null | undefined): boolean {
  return Boolean(user && user.admin === true);
}

export interface ProductUpsertInput {
  name: string;
  category: OfficialCategory;
  description: string;
  price: number;
  availability: ProductAvailability;
  images: string[];
  published: boolean;
  collectionIds: string[];
  boxIds: string[];
}

export async function createProductAdmin(input: ProductUpsertInput): Promise<string> {
  await ensureAdminVerifiedInFirestore();
  const cleanName = sanitizeString(input.name, 200);
  if (!cleanName) {
    throw new Error('Product name is required.');
  }
  if (!isOfficialCategory(input.category)) {
    throw new Error('A valid official category is required.');
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error('A valid price in NGN (₦) is required.');
  }

  const cleanImages = input.images
    .map((url) => sanitizeString(url, 1000))
    .filter((url) => url.length > 0);

  const payload = {
    name: cleanName,
    category: input.category,
    description: sanitizeString(input.description, 4000),
    price: Number(input.price),
    currency: 'NGN' as const,
    availability: input.availability,
    images: cleanImages,
    published: Boolean(input.published),
    collectionIds: input.collectionIds.filter(Boolean),
    boxIds: input.boxIds.filter(Boolean),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, 'products'), payload);
    // Explicitly verify write confirmation by reading back from Firestore
    const writtenSnap = await getDoc(docRef);
    if (!writtenSnap.exists()) {
      throw new Error(`Failed to confirm product persistence in Firestore for ID ${docRef.id}`);
    }
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'products');
  }
}

export async function updateProductAdmin(
  productId: string,
  input: ProductUpsertInput
): Promise<void> {
  await ensureAdminVerifiedInFirestore();
  const cleanName = sanitizeString(input.name, 200);
  if (!cleanName) {
    throw new Error('Product name is required.');
  }
  if (!isOfficialCategory(input.category)) {
    throw new Error('A valid official category is required.');
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error('A valid price in NGN (₦) is required.');
  }

  const cleanImages = input.images
    .map((url) => sanitizeString(url, 1000))
    .filter((url) => url.length > 0);

  const path = `products/${productId}`;
  const docRef = doc(db, 'products', productId);
  try {
    await updateDoc(docRef, {
      name: cleanName,
      category: input.category,
      description: sanitizeString(input.description, 4000),
      price: Number(input.price),
      currency: 'NGN',
      availability: input.availability,
      images: cleanImages,
      published: Boolean(input.published),
      collectionIds: input.collectionIds.filter(Boolean),
      boxIds: input.boxIds.filter(Boolean),
      updatedAt: serverTimestamp(),
    });
    const updatedSnap = await getDoc(docRef);
    if (!updatedSnap.exists()) {
      throw new Error(`Failed to confirm product update in Firestore for ID ${productId}`);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateProductImagesAdmin(
  productId: string,
  images: string[]
): Promise<void> {
  await ensureAdminVerifiedInFirestore();
  const cleanImages = images
    .map((url) => sanitizeString(url, 1000))
    .filter((url) => url.length > 0);

  const path = `products/${productId}`;
  try {
    await updateDoc(doc(db, 'products', productId), {
      images: cleanImages,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleProductPublishAdmin(
  productId: string,
  published: boolean
): Promise<void> {
  await ensureAdminVerifiedInFirestore();
  const path = `products/${productId}`;
  try {
    await updateDoc(doc(db, 'products', productId), {
      published: Boolean(published),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProductAdmin(productId: string): Promise<void> {
  await ensureAdminVerifiedInFirestore();
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCollectionAdmin(collectionItem: Collection): Promise<void> {
  await ensureAdminVerifiedInFirestore();
  const path = `collections/${collectionItem.id}`;
  try {
    await setDoc(
      doc(db, 'collections', collectionItem.id),
      {
        id: collectionItem.id,
        name: sanitizeString(collectionItem.name, 160),
        description: sanitizeString(collectionItem.description, 1000),
        productIds: collectionItem.productIds.filter(Boolean),
        published: Boolean(collectionItem.published),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveBoxSetAdmin(box: Box): Promise<void> {
  await ensureAdminVerifiedInFirestore();
  const path = `boxes/${box.id}`;
  const validPrice =
    typeof box.price === 'number' && Number.isFinite(box.price) && box.price > 0
      ? Number(box.price)
      : null;

  try {
    await setDoc(
      doc(db, 'boxes', box.id),
      {
        id: box.id,
        name: sanitizeString(box.name, 160),
        composition: sanitizeString(box.composition, 500),
        description: sanitizeString(box.description, 2000),
        productIds: box.productIds.filter(Boolean),
        price: validPrice,
        currency: 'NGN',
        published: Boolean(box.published && validPrice !== null && box.productIds.length > 0),
        images: box.images.map((u) => sanitizeString(u, 1000)).filter(Boolean),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
