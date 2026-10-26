import {
  OFFICIAL_CATEGORIES,
  OfficialCategory,
  ProductAvailability,
} from '../types';

/**
 * Formats a numeric price in Nigerian Naira (₦ / NGN).
 * Never renders undefined, null, or NaN.
 */
export function formatNaira(amount: unknown): string {
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(num) || num < 0) {
    return '₦0';
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Normalizes any timestamp value from Firestore (Timestamp, Date, ISO string, number)
 * into a safe ISO string without ever producing "undefined" or "Invalid Date".
 */
export function normalizeTimestamp(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? '' : new Date(parsed).toISOString();
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return new Date(val).toISOString();
  }
  if (typeof val === 'object' && val !== null) {
    const maybeTs = val as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      try {
        return maybeTs.toDate().toISOString();
      } catch {
        return '';
      }
    }
    if (typeof maybeTs.seconds === 'number') {
      return new Date(maybeTs.seconds * 1000).toISOString();
    }
  }
  return '';
}

export function formatDisplayDate(isoString: string | undefined | null): string {
  if (!isoString) return '';
  const parsed = Date.parse(isoString);
  if (Number.isNaN(parsed)) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(parsed));
}

export function isOfficialCategory(val: unknown): val is OfficialCategory {
  return (
    val === 'Jewelry' ||
    val === 'Watches' ||
    val === 'Glasses' ||
    val === 'Perfume' ||
    val === 'Home Fragrance'
  );
}

export function getCustomerCategoryLabel(category: OfficialCategory): string {
  const found = OFFICIAL_CATEGORIES.find((c) => c.internalCategory === category);
  return found ? found.customerLabel : category;
}

export function getAvailabilityLabel(availability: ProductAvailability): string {
  switch (availability) {
    case 'in_stock':
      return 'Available';
    case 'limited':
      return 'Limited Availability';
    case 'out_of_stock':
      return 'Unavailable';
    default:
      return 'Available';
  }
}

export function sanitizeString(val: unknown, maxLength = 500): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLength);
}
