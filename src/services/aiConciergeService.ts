import { Product } from '../types';

export interface StyleConsultationAnswers {
  category: string;
  occasion: string;
  style: string;
  color: string;
  budgetMax: number | null;
}

export interface GiftConsultationAnswers {
  recipient: string;
  occasion: string;
  style: string;
  giftType: string;
  budgetMax: number | null;
}

export interface RecommendationResult {
  productId: string;
  reason: string;
}

export interface ConciergeResponse {
  headline: string;
  conciergeNote: string;
  recommendations: RecommendationResult[];
  isNoMatch: boolean;
  noMatchExplanation?: string;
  suggestedCategory?: string;
  isAiPowered: boolean;
}

const VIEWED_PRODUCTS_STORAGE_KEY = 'lr_viewed_product_ids';

/**
 * Tracks a viewed product ID in the local session for context-aware recommendations.
 */
export function recordViewedProduct(productId: string): void {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const raw = sessionStorage.getItem(VIEWED_PRODUCTS_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((id) => id !== productId);
    filtered.unshift(productId);
    sessionStorage.setItem(
      VIEWED_PRODUCTS_STORAGE_KEY,
      JSON.stringify(filtered.slice(0, 12))
    );
  } catch {
    // Non-blocking storage fallback
  }
}

/**
 * Retrieves recently viewed product IDs for the current session.
 */
export function getRecentlyViewedProductIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(VIEWED_PRODUCTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Queries the server-side LUNA ROYALE AI Concierge endpoint.
 * Always validates that returned recommendations correspond to actual published Firestore products.
 */
export async function fetchConciergeRecommendations(params: {
  mode: 'style' | 'gift' | 'curated';
  answers?: Partial<StyleConsultationAnswers & GiftConsultationAnswers>;
  candidateProducts: Product[];
  customerContext?: {
    wishlistProductIds?: string[];
    cartProductIds?: string[];
    orderedProductIds?: string[];
    recentlyViewedIds?: string[];
  };
}): Promise<ConciergeResponse> {
  const publishedProducts = params.candidateProducts.filter(
    (p) => p.published && p.availability !== 'out_of_stock'
  );

  if (publishedProducts.length === 0) {
    return {
      headline: 'Atelier Notice',
      conciergeNote:
        'No products are available for recommendations yet. Our artisans are currently preparing new pieces for the collection.',
      recommendations: [],
      isNoMatch: true,
      noMatchExplanation: 'No products are currently available in the catalog.',
      isAiPowered: false,
    };
  }

  // Safe subset of product metadata sent to the server (zero sensitive internal data)
  const productPayload = publishedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    price: p.price,
    availability: p.availability,
    published: p.published,
    images: p.images.slice(0, 1),
  }));

  try {
    const res = await fetch('/api/ai/concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: params.mode,
        answers: params.answers || {},
        customerContext: params.customerContext || {},
        candidateProducts: productPayload,
      }),
    });

    if (res.ok) {
      const data: ConciergeResponse = await res.json();
      // Client-side hard verification: filter strictly to products that actually exist in candidateProducts
      const validMap = new Map(publishedProducts.map((p) => [p.id, p]));
      const verifiedRecs = (data.recommendations || []).filter((r) =>
        validMap.has(r.productId)
      );

      return {
        ...data,
        recommendations: verifiedRecs,
        isNoMatch: verifiedRecs.length === 0,
      };
    }
  } catch (err) {
    console.warn('AI Concierge endpoint unreachable, activating atelier heuristic:', err);
  }

  // Client-side deterministic luxury heuristic fallback
  return runLocalLuxuryConciergeMatcher(params.mode, params.answers || {}, publishedProducts);
}

/**
 * Deterministic luxury recommendation matcher.
 * Guaranteed to only recommend real products from the catalog.
 */
export function runLocalLuxuryConciergeMatcher(
  mode: 'style' | 'gift' | 'curated',
  answers: Partial<StyleConsultationAnswers & GiftConsultationAnswers>,
  availableProducts: Product[]
): ConciergeResponse {
  const budget =
    typeof answers.budgetMax === 'number' && answers.budgetMax > 0
      ? answers.budgetMax
      : null;

  // Filter products by budget
  let matching = availableProducts.filter((p) => {
    if (budget !== null && p.price > budget) return false;
    return true;
  });

  if (matching.length === 0) {
    return {
      headline: 'Budget Consultation',
      conciergeNote:
        'I couldn’t find an available product within that budget right now. You can adjust your budget or explore our catalog.',
      recommendations: [],
      isNoMatch: true,
      noMatchExplanation: 'No available items fit within the selected budget threshold.',
      isAiPowered: false,
    };
  }

  // Category filtering if specified
  const targetCategory = answers.category;
  if (targetCategory && targetCategory !== 'Any' && targetCategory !== 'Open to suggestions') {
    const categoryMatches = matching.filter(
      (p) => p.category.toLowerCase() === targetCategory.toLowerCase()
    );
    if (categoryMatches.length > 0) {
      matching = categoryMatches;
    }
  }

  if (mode === 'style') {
    const styleChoice = answers.style || 'Elegant';
    const occasionChoice = answers.occasion || 'Special event';

    const recommendations = matching.slice(0, 4).map((p) => ({
      productId: p.id,
      reason: `Recommended because you selected ${styleChoice.toLowerCase()} style for ${occasionChoice.toLowerCase()} wear.`,
    }));

    return {
      headline: 'Curated for Your Style',
      conciergeNote: `Based on your preference for ${styleChoice.toLowerCase()} silhouettes and ${occasionChoice.toLowerCase()} occasions, these LUNA ROYALE pieces reflect your personal aesthetic.`,
      recommendations,
      isNoMatch: recommendations.length === 0,
      isAiPowered: false,
    };
  }

  if (mode === 'gift') {
    const recipient = answers.recipient || 'someone special';
    const occasion = answers.occasion || 'a celebration';

    const recommendations = matching.slice(0, 4).map((p) => ({
      productId: p.id,
      reason: `Recommended as a thoughtful gift for your ${recipient.toLowerCase()} on ${occasion.toLowerCase()}.`,
    }));

    return {
      headline: `The Gift Selection for ${recipient}`,
      conciergeNote: `Curated with care for your ${recipient.toLowerCase()} celebrating ${occasion.toLowerCase()}. Each piece embodies timeless presentation and refinement.`,
      recommendations,
      isNoMatch: recommendations.length === 0,
      isAiPowered: false,
    };
  }

  // 'curated'
  const recommendations = matching.slice(0, 4).map((p) => ({
    productId: p.id,
    reason: 'Recommended to complement your current LUNA ROYALE preferences and taste.',
  }));

  return {
    headline: 'Selected for You',
    conciergeNote:
      'A refined selection from our current catalog, curated around elegance, timeless craftsmanship, and balanced design.',
    recommendations,
    isNoMatch: recommendations.length === 0,
    isAiPowered: false,
  };
}
