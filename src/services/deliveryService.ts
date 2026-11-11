import { DEFAULT_DELIVERY_RATES, DeliveryRate } from '../data/defaultDeliveryRates';

const STORAGE_KEY = 'lr_delivery_rates_custom_v1';

export function getAllDeliveryRates(): DeliveryRate[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_DELIVERY_RATES];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_DELIVERY_RATES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore parse errors, fallback to default
  }

  return [...DEFAULT_DELIVERY_RATES];
}

export function saveAllDeliveryRates(rates: DeliveryRate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
    // Dispatch custom event for immediate reactive synchronization across components
    window.dispatchEvent(new CustomEvent('lr_delivery_rates_updated', { detail: rates }));
  } catch {
    // Ignore storage errors
  }
}

export function resetDeliveryRatesToDefault(): DeliveryRate[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(
        new CustomEvent('lr_delivery_rates_updated', { detail: DEFAULT_DELIVERY_RATES })
      );
    } catch {
      // Ignore
    }
  }
  return [...DEFAULT_DELIVERY_RATES];
}

export function updateDeliveryRate(
  id: string,
  updates: Partial<Omit<DeliveryRate, 'id'>>
): DeliveryRate[] {
  const current = getAllDeliveryRates();
  const next = current.map((r) => (r.id === id ? { ...r, ...updates } : r));
  saveAllDeliveryRates(next);
  return next;
}

export function addDeliveryRate(
  newRate: Omit<DeliveryRate, 'id'>
): DeliveryRate[] {
  const current = getAllDeliveryRates();
  const id = `rate-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const rate: DeliveryRate = {
    ...newRate,
    id,
  };
  const next = [rate, ...current];
  saveAllDeliveryRates(next);
  return next;
}

export function toggleDeliveryRateActive(id: string): DeliveryRate[] {
  const current = getAllDeliveryRates();
  const next = current.map((r) => (r.id === id ? { ...r, active: !r.active } : r));
  saveAllDeliveryRates(next);
  return next;
}

export function togglePayOnArrival(id: string): DeliveryRate[] {
  const current = getAllDeliveryRates();
  const next = current.map((r) =>
    r.id === id ? { ...r, payOnArrivalAllowed: !r.payOnArrivalAllowed } : r
  );
  saveAllDeliveryRates(next);
  return next;
}

export function deleteDeliveryRate(id: string): DeliveryRate[] {
  const current = getAllDeliveryRates();
  const next = current.filter((r) => r.id !== id);
  saveAllDeliveryRates(next);
  return next;
}

/**
 * Normalizes string for fuzzy/direct location matching.
 */
function cleanStr(s?: string | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface DeliveryLookupResult {
  options: DeliveryRate[];
  quoteRequired: boolean;
  isUnavailable: boolean;
  message?: string;
}

/**
 * Matches customer delivery input to all applicable delivery rates.
 * If multiple couriers service the destination (e.g. Benin: Iyare, GUO, LIBMOT),
 * all matching active options are returned so the customer can choose.
 */
export function lookupDeliveryOptions(params: {
  country?: string;
  state?: string;
  cityOrArea?: string;
  rates?: DeliveryRate[];
}): DeliveryLookupResult {
  const country = (params.country || 'Nigeria').trim();
  const cleanCountry = cleanStr(country);
  const allRates = (params.rates || getAllDeliveryRates()).filter((r) => r.active);

  // 1. Check if International
  const isInternational =
    cleanCountry !== 'nigeria' &&
    cleanCountry !== 'ng' &&
    cleanCountry !== 'naija' &&
    cleanCountry.length > 0;

  if (isInternational) {
    // Check if the country matches an international route
    const intlMatch = allRates.find(
      (r) =>
        r.region === 'international' &&
        cleanStr(r.destination).includes(cleanCountry)
    );

    return {
      options: intlMatch ? [intlMatch] : [],
      quoteRequired: true,
      isUnavailable: false,
      message: 'International delivery fee requires a logistics quote.',
    };
  }

  // 2. Domestic (Nigeria) Matching
  const targetArea = cleanStr(params.cityOrArea);
  const targetState = cleanStr(params.state);

  if (!targetArea && !targetState) {
    return {
      options: [],
      quoteRequired: false,
      isUnavailable: false,
    };
  }

  // Find exact and partial matches
  const matchedOptions: DeliveryRate[] = [];

  for (const rate of allRates) {
    if (rate.region === 'international') continue;

    const rateDest = cleanStr(rate.destination);
    const rateState = cleanStr(rate.state);

    // Exact destination match or direct token inclusion
    const destMatch =
      targetArea.length >= 3 &&
      (rateDest === targetArea ||
        rateDest.includes(targetArea) ||
        targetArea.includes(rateDest));

    // Secondary match: when customer specifies state and destination area
    const stateMatch =
      targetState.length >= 3 &&
      rateState.length >= 3 &&
      (rateState.includes(targetState) || targetState.includes(rateState));

    if (destMatch) {
      // Prioritize destination matches
      matchedOptions.push(rate);
    } else if (stateMatch && targetArea.length === 0) {
      // If user only selected state with no specific city yet
      matchedOptions.push(rate);
    }
  }

  if (matchedOptions.length > 0) {
    return {
      options: matchedOptions,
      quoteRequired: false,
      isUnavailable: false,
    };
  }

  // If user entered a city/area and no match was found:
  if (targetArea.length >= 2) {
    return {
      options: [],
      quoteRequired: false,
      isUnavailable: true,
      message:
        'Delivery fee currently unavailable for this location. Please contact customer support.',
    };
  }

  return {
    options: [],
    quoteRequired: false,
    isUnavailable: false,
  };
}
