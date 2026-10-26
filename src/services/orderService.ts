import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { CartItem, DeliveryInfo, Order, OrderStatus, ShippingFeeStatus } from '../types';
import { sanitizeCartItems, calculateCartSubtotal } from './cartService';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { ensureAdminVerifiedInFirestore } from './authService';
import { normalizeTimestamp, sanitizeString } from './firestoreService';

export function mapFirestoreOrder(
  id: string,
  data: Record<string, unknown>
): Order | null {
  const userId = sanitizeString(
    data.userId || data.uid || data.customerId,
    128
  );
  if (!userId) return null;

  const items = sanitizeCartItems(data.items);
  const rawSubtotal =
    typeof data.subtotal === 'number'
      ? data.subtotal
      : Number(data.subtotal || data.amount);
  const subtotal =
    Number.isFinite(rawSubtotal) && rawSubtotal >= 0
      ? rawSubtotal
      : calculateCartSubtotal(items);

  const rawShippingFee = data.shippingFee;
  const shippingFee =
    typeof rawShippingFee === 'number' &&
    Number.isFinite(rawShippingFee) &&
    rawShippingFee >= 0
      ? rawShippingFee
      : null;

  const shippingStatus: ShippingFeeStatus =
    data.shippingStatus === 'confirmed' ? 'confirmed' : 'pending_confirmation';

  const rawTotal =
    typeof data.totalAmount === 'number'
      ? data.totalAmount
      : Number(data.totalAmount);
  const totalAmount =
    Number.isFinite(rawTotal) && rawTotal > 0
      ? rawTotal
      : subtotal + (shippingFee || 0);

  const rawStatus = (data.status || data.orderStatus || 'pending') as string;
  const status: OrderStatus =
    rawStatus === 'confirmed' ||
    rawStatus === 'processing' ||
    rawStatus === 'shipped' ||
    rawStatus === 'delivered' ||
    rawStatus === 'cancelled'
      ? rawStatus
      : 'pending';

  const rawDelivery = (data.deliveryInfo as Record<string, unknown>) || {};
  const deliveryInfo: DeliveryInfo = {
    recipientName: sanitizeString(
      rawDelivery.recipientName || data.customerName || data.name,
      160
    ),
    phone: sanitizeString(rawDelivery.phone || data.customerPhone || data.phone, 40),
    streetAddress: sanitizeString(rawDelivery.streetAddress, 300),
    city: sanitizeString(rawDelivery.city, 100),
    state: sanitizeString(rawDelivery.state, 100),
    postalCode:
      sanitizeString(rawDelivery.postalCode || data.postalCode, 40) || undefined,
    country: sanitizeString(rawDelivery.country, 100) || 'Nigeria',
    deliveryNotes: sanitizeString(rawDelivery.deliveryNotes, 500),
  };

  return {
    id,
    userId,
    customerEmail: sanitizeString(data.customerEmail || data.email, 256),
    customerName: sanitizeString(
      data.customerName || data.name || rawDelivery.recipientName,
      160
    ),
    items,
    subtotal,
    shippingFee,
    shippingStatus,
    shippingConfirmedAt: normalizeTimestamp(data.shippingConfirmedAt),
    shippingNotes: sanitizeString(data.shippingNotes, 500) || undefined,
    totalAmount,
    currency: 'NGN',
    status,
    deliveryInfo,
    paymentReference:
      sanitizeString(data.paymentReference || data.reference, 128) || undefined,
    paidAt: normalizeTimestamp(data.paidAt),
    createdAt: normalizeTimestamp(data.createdAt || data.paidAt),
    updatedAt: normalizeTimestamp(data.updatedAt || data.paidAt || data.createdAt),
  };
}

/**
 * Subscribes to orders belonging strictly to the authenticated user (`userId == uid`).
 * Never exposes another user's orders.
 */
export function subscribeToUserOrders(
  uid: string,
  onData: (orders: Order[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(collection(db, 'orders'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        const mapped = mapFirestoreOrder(
          docSnap.id,
          docSnap.data() as Record<string, unknown>
        );
        if (mapped) list.push(mapped);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(list);
    },
    (err) => {
      onData([]);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes to all orders in `/orders` for verified administrators (`/users/{uid}.admin == true`).
 */
export function subscribeToAllOrdersAdmin(
  onData: (orders: Order[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const ordersRef = collection(db, 'orders');
  return onSnapshot(
    ordersRef,
    (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        const mapped = mapFirestoreOrder(
          docSnap.id,
          docSnap.data() as Record<string, unknown>
        );
        if (mapped) list.push(mapped);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(list);
    },
    (err) => {
      console.warn('subscribeToAllOrdersAdmin snapshot issue, fallback available:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Direct administrative fetch of all customer orders in `/orders`.
 */
export async function getAllOrdersAdmin(): Promise<Order[]> {
  await ensureAdminVerifiedInFirestore();
  const ordersRef = collection(db, 'orders');
  const snapshot = await getDocs(ordersRef);
  const list: Order[] = [];
  snapshot.forEach((docSnap) => {
    const mapped = mapFirestoreOrder(
      docSnap.id,
      docSnap.data() as Record<string, unknown>
    );
    if (mapped) list.push(mapped);
  });
  list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return list;
}

export async function createOrder(params: {
  userId: string;
  customerEmail: string;
  customerName: string;
  items: CartItem[];
  deliveryInfo: DeliveryInfo;
  paymentReference?: string;
}): Promise<string> {
  const cleanItems = sanitizeCartItems(params.items);
  if (cleanItems.length === 0) {
    throw new Error('Cannot create an order with an empty cart.');
  }

  const subtotal = calculateCartSubtotal(cleanItems);
  const payload: Record<string, unknown> = {
    userId: params.userId,
    customerEmail: sanitizeString(params.customerEmail, 256),
    customerName: sanitizeString(params.customerName, 160),
    items: cleanItems,
    subtotal,
    shippingFee: null,
    shippingStatus: 'pending_confirmation',
    totalAmount: subtotal,
    currency: 'NGN',
    status: 'pending',
    deliveryInfo: {
      recipientName: sanitizeString(params.deliveryInfo.recipientName, 160),
      phone: sanitizeString(params.deliveryInfo.phone, 40),
      streetAddress: sanitizeString(params.deliveryInfo.streetAddress, 300),
      city: sanitizeString(params.deliveryInfo.city, 100),
      state: sanitizeString(params.deliveryInfo.state, 100),
      postalCode: sanitizeString(params.deliveryInfo.postalCode, 40) || '',
      country: sanitizeString(params.deliveryInfo.country, 100) || 'Nigeria',
      deliveryNotes: sanitizeString(params.deliveryInfo.deliveryNotes, 500),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (params.paymentReference) {
    payload.paymentReference = sanitizeString(params.paymentReference, 128);
  }

  try {
    const docRef = await addDoc(collection(db, 'orders'), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'orders');
  }
}

/**
 * Administrative action: confirms the exact worldwide shipping fee in NGN for an order.
 * Strictly verifies admin credentials in Firestore before updating.
 */
export async function confirmOrderShippingFeeAdmin(
  orderId: string,
  shippingFee: number,
  shippingNotes?: string
): Promise<void> {
  await ensureAdminVerifiedInFirestore();
  const cleanFee = typeof shippingFee === 'number' ? shippingFee : Number(shippingFee);
  if (!Number.isFinite(cleanFee) || cleanFee < 0) {
    throw new Error('Please enter a valid shipping fee in NGN (0 or greater).');
  }

  const path = `orders/${orderId}`;
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Order document not found in the atelier registry.');
    }

    const orderData = orderSnap.data() as Record<string, unknown>;
    const subtotal =
      typeof orderData.subtotal === 'number'
        ? orderData.subtotal
        : Number(orderData.subtotal || 0);
    const newTotalAmount = subtotal + cleanFee;

    await updateDoc(orderRef, {
      shippingFee: cleanFee,
      shippingStatus: 'confirmed',
      shippingConfirmedAt: serverTimestamp(),
      shippingNotes: sanitizeString(shippingNotes, 500) || '',
      totalAmount: newTotalAmount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateOrderStatusAdmin(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  await ensureAdminVerifiedInFirestore();
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Checks server-side Paystack gateway readiness without exposing any credentials.
 */
export async function checkPaymentGatewayStatus(): Promise<{
  configured: boolean;
  gateway: string;
}> {
  try {
    const res = await fetch('/api/payments/status');
    if (!res.ok) return { configured: false, gateway: 'paystack' };
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      gateway: data.gateway || 'paystack',
    };
  } catch {
    return { configured: false, gateway: 'paystack' };
  }
}

/**
 * Initializes a Paystack transaction on the server.
 * Validates the amount against order/cart items, and returns the authorization URL.
 */
export async function initializePaymentTransaction(params: {
  email: string;
  amountNaira: number;
  orderId: string;
  items?: CartItem[];
  callbackUrl?: string;
  idToken?: string;
}): Promise<{
  authorization_url: string;
  access_code: string;
  reference: string;
}> {
  const token = params.idToken || (await auth.currentUser?.getIdToken());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/payments/initialize', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: params.email,
      amountNaira: params.amountNaira,
      orderId: params.orderId,
      items: params.items?.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      callbackUrl: params.callbackUrl,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data?.error || 'Unable to initialize payment with Paystack.');
  }

  return {
    authorization_url: data.authorization_url,
    access_code: data.access_code,
    reference: data.reference,
  };
}

/**
 * Verifies a Paystack payment reference with the server.
 * Server validates status directly with Paystack API.
 */
export async function verifyPaymentTransaction(reference: string): Promise<{
  status: boolean;
  verified: boolean;
  transaction?: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paidAt?: string;
    orderId?: string | null;
  };
  error?: string;
}> {
  try {
    const res = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
    const data = await res.json();
    if (!res.ok || !data.status) {
      return {
        status: false,
        verified: false,
        error: data?.error || 'Payment verification failed.',
      };
    }
    return {
      status: true,
      verified: Boolean(data.verified),
      transaction: data.transaction,
    };
  } catch {
    return {
      status: false,
      verified: false,
      error: 'Failed to communicate with payment verification service.',
    };
  }
}

/**
 * Updates an order after verified payment to record paymentReference and status 'confirmed'.
 */
export async function markOrderPaid(
  orderId: string,
  paymentReference: string,
  paidAt?: string
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'confirmed',
      paymentReference: sanitizeString(paymentReference, 128),
      paidAt: paidAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
