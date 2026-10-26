/**
 * Official internal product categories required by LUNA ROYALE.
 * Customer-facing labels map to these exact internal values:
 * - Jewelry -> 'Jewelry'
 * - Watches -> 'Watches'
 * - Eyewear -> 'Glasses'
 * - Fragrance -> 'Perfume'
 * - Royale Home -> 'Home Fragrance'
 */
export type OfficialCategory =
  | 'Jewelry'
  | 'Watches'
  | 'Glasses'
  | 'Perfume'
  | 'Home Fragrance';

export interface CategoryMapping {
  internalCategory: OfficialCategory;
  customerLabel: string;
  navSlug: 'jewelry' | 'watches' | 'eyewear' | 'fragrance' | 'royale-home';
  subtitle: string;
}

export const OFFICIAL_CATEGORIES: CategoryMapping[] = [
  {
    internalCategory: 'Jewelry',
    customerLabel: 'Jewelry',
    navSlug: 'jewelry',
    subtitle: 'Fine adornments crafted for timeless distinction.',
  },
  {
    internalCategory: 'Watches',
    customerLabel: 'Watches',
    navSlug: 'watches',
    subtitle: 'Precision horology and enduring silhouettes.',
  },
  {
    internalCategory: 'Glasses',
    customerLabel: 'Eyewear',
    navSlug: 'eyewear',
    subtitle: 'Architectural frames and optical refinement.',
  },
  {
    internalCategory: 'Perfume',
    customerLabel: 'Fragrance',
    navSlug: 'fragrance',
    subtitle: 'Signature olfactory compositions.',
  },
  {
    internalCategory: 'Home Fragrance',
    customerLabel: 'Royale Home',
    navSlug: 'royale-home',
    subtitle: 'Candles, diffusers, and ambient home fragrance.',
  },
];

export type ProductAvailability = 'in_stock' | 'out_of_stock' | 'limited';

export interface Product {
  id: string;
  name: string;
  category: OfficialCategory;
  description: string;
  price: number;
  currency: 'NGN';
  availability: ProductAvailability;
  images: string[];
  published: boolean;
  collectionIds: string[];
  boxIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  published: boolean;
  updatedAt?: string;
}

export const OFFICIAL_COLLECTIONS: Collection[] = [
  {
    id: 'the-luna-collection',
    name: 'THE LUNA COLLECTION',
    description: 'Soft, feminine pieces.',
    productIds: [],
    published: true,
  },
  {
    id: 'the-royale-collection',
    name: 'THE ROYALE COLLECTION',
    description: 'Bold, sophisticated pieces.',
    productIds: [],
    published: true,
  },
  {
    id: 'the-noir-collection',
    name: 'THE NOIR COLLECTION',
    description: 'Black/darker pieces.',
    productIds: [],
    published: true,
  },
  {
    id: 'the-burgundy-collection',
    name: 'THE BURGUNDY COLLECTION',
    description: 'Pieces inspired by your signature color.',
    productIds: [],
    published: true,
  },
  {
    id: 'the-signature-scent-collection',
    name: 'THE SIGNATURE SCENT COLLECTION',
    description: 'Your perfume line.',
    productIds: [],
    published: true,
  },
  {
    id: 'the-royale-home-collection',
    name: 'THE ROYALE HOME COLLECTION',
    description: 'Your candles, diffusers and home fragrances.',
    productIds: [],
    published: true,
  },
];

export interface Box {
  id: string;
  name: string;
  composition: string;
  description: string;
  productIds: string[];
  price: number | null;
  currency: 'NGN';
  published: boolean;
  images: string[];
  updatedAt?: string;
}

export const OFFICIAL_BOXES: Box[] = [
  {
    id: 'the-luna-box',
    name: 'THE LUNA BOX',
    composition: 'Jewelry + perfume',
    description: 'Curated pairing of fine jewelry and signature perfume.',
    productIds: [],
    price: null,
    currency: 'NGN',
    published: false,
    images: [],
  },
  {
    id: 'the-royale-box',
    name: 'THE ROYALE BOX',
    composition: 'Watch + bracelet + perfume',
    description: 'Complete ensemble combining a timepiece, bracelet, and signature perfume.',
    productIds: [],
    price: null,
    currency: 'NGN',
    published: false,
    images: [],
  },
  {
    id: 'the-signature-box',
    name: 'THE SIGNATURE BOX',
    composition: 'Necklace + earrings + perfume',
    description: 'Matched necklace and earrings accompanied by signature perfume.',
    productIds: [],
    price: null,
    currency: 'NGN',
    published: false,
    images: [],
  },
  {
    id: 'the-royale-home-set',
    name: 'THE ROYALE HOME SET',
    composition: 'Candle + room spray + perfume',
    description: 'Olfactory ritual featuring a scented candle, room spray, and signature perfume.',
    productIds: [],
    price: null,
    currency: 'NGN',
    published: false,
    images: [],
  },
  {
    id: 'the-love-edit',
    name: 'THE LOVE EDIT',
    composition: 'Couple watches + fragrance + jewelry',
    description: 'Dual timepieces paired with signature fragrance and fine jewelry.',
    productIds: [],
    price: null,
    currency: 'NGN',
    published: false,
    images: [],
  },
];

export interface DeliveryInfo {
  recipientName: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  deliveryNotes?: string;
}

export interface User {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  admin: boolean;
  deliveryInfo: DeliveryInfo | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  itemType: 'product' | 'box';
  name: string;
  categoryLabel: string;
  price: number;
  currency: 'NGN';
  quantity: number;
  image: string | null;
}

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type ShippingFeeStatus = 'pending_confirmation' | 'confirmed';

export interface Order {
  id: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  shippingFee: number | null;
  shippingStatus: ShippingFeeStatus;
  shippingConfirmedAt?: string;
  shippingNotes?: string;
  totalAmount: number;
  currency: 'NGN';
  status: OrderStatus;
  deliveryInfo: DeliveryInfo;
  paymentReference?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  userId: string;
  reference: string;
  amount: number;
  currency: 'NGN';
  status: string;
  gateway: 'paystack';
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  orderId?: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export type AppSection =
  | 'home'
  | 'shop'
  | 'jewelry'
  | 'watches'
  | 'eyewear'
  | 'fragrance'
  | 'royale-home'
  | 'collections'
  | 'gift-sets'
  | 'about'
  | 'contact'
  | 'concierge'
  | 'wishlist'
  | 'cart'
  | 'account'
  | 'orders'
  | 'delivery'
  | 'admin'
  | 'product-detail';
