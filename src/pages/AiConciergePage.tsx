import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Compass,
  Gift,
  HelpCircle,
  RotateCcw,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { AppSection, CartItem, Order, Product, User, WishlistItem } from '../types';
import { ProductCard } from '../components/ProductCard';
import {
  ConciergeResponse,
  fetchConciergeRecommendations,
  getRecentlyViewedProductIds,
  GiftConsultationAnswers,
  StyleConsultationAnswers,
} from '../services/aiConciergeService';

interface AiConciergePageProps {
  products: Product[];
  isLoadingProducts: boolean;
  user: User | null;
  wishlistItems: WishlistItem[];
  cartItems: CartItem[];
  userOrders: Order[];
  wishlistIds: Set<string>;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (productId: string) => void;
  onNavigate: (section: AppSection) => void;
}

type ConciergeMode = 'style' | 'gift' | 'curated';

export const AiConciergePage: React.FC<AiConciergePageProps> = ({
  products,
  isLoadingProducts,
  user,
  wishlistItems,
  cartItems,
  userOrders,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
  onNavigate,
}) => {
  const [activeMode, setActiveMode] = useState<ConciergeMode>('style');
  const [isConsulting, setIsConsulting] = useState(false);
  const [result, setResult] = useState<ConciergeResponse | null>(null);

  // Style Questionnaire State
  const [styleCategory, setStyleCategory] = useState('Open to suggestions');
  const [styleOccasion, setStyleOccasion] = useState('Everyday');
  const [stylePreference, setStylePreference] = useState('Elegant');
  const [styleColor, setStyleColor] = useState('Gold');
  const [styleBudgetPreset, setStyleBudgetPreset] = useState<string>('any');
  const [styleCustomBudget, setStyleCustomBudget] = useState<string>('');

  // Gift Questionnaire State
  const [giftRecipient, setGiftRecipient] = useState('Partner');
  const [giftOccasion, setGiftOccasion] = useState('Birthday');
  const [giftStyle, setGiftStyle] = useState('Elegant');
  const [giftType, setGiftType] = useState('A set');
  const [giftBudgetPreset, setGiftBudgetPreset] = useState<string>('any');
  const [giftCustomBudget, setGiftCustomBudget] = useState<string>('');

  // Catalog Map
  const publishedAvailableProducts = useMemo(
    () => products.filter((p) => p.published && p.availability !== 'out_of_stock'),
    [products]
  );

  const productMap = useMemo(() => {
    return new Map<string, Product>(products.map((p) => [p.id, p]));
  }, [products]);

  const parseBudget = (preset: string, custom: string): number | null => {
    if (preset === 'under5k') return 5000;
    if (preset === '5k-15k') return 15000;
    if (preset === '15k-50k') return 50000;
    if (preset === 'custom') {
      const num = Number(custom);
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    return null; // 'any'
  };

  const handleRunStyleConsultation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsConsulting(true);

    const answers: StyleConsultationAnswers = {
      category: styleCategory,
      occasion: styleOccasion,
      style: stylePreference,
      color: styleColor,
      budgetMax: parseBudget(styleBudgetPreset, styleCustomBudget),
    };

    const res = await fetchConciergeRecommendations({
      mode: 'style',
      answers,
      candidateProducts: publishedAvailableProducts,
      customerContext: {
        wishlistProductIds: wishlistItems.map((w) => w.productId),
        cartProductIds: cartItems.map((c) => c.productId),
        orderedProductIds: userOrders.flatMap((o) => o.items.map((i) => i.productId)),
        recentlyViewedIds: getRecentlyViewedProductIds(),
      },
    });

    setResult(res);
    setIsConsulting(false);
  };

  const handleRunGiftConsultation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsConsulting(true);

    const answers: GiftConsultationAnswers = {
      recipient: giftRecipient,
      occasion: giftOccasion,
      style: giftStyle,
      giftType,
      budgetMax: parseBudget(giftBudgetPreset, giftCustomBudget),
    };

    const res = await fetchConciergeRecommendations({
      mode: 'gift',
      answers,
      candidateProducts: publishedAvailableProducts,
      customerContext: {
        wishlistProductIds: wishlistItems.map((w) => w.productId),
        cartProductIds: cartItems.map((c) => c.productId),
        orderedProductIds: userOrders.flatMap((o) => o.items.map((i) => i.productId)),
        recentlyViewedIds: getRecentlyViewedProductIds(),
      },
    });

    setResult(res);
    setIsConsulting(false);
  };

  const handleRunCuratedConsultation = async () => {
    setIsConsulting(true);
    const viewedIds = getRecentlyViewedProductIds();
    const wishlistProductIds = wishlistItems.map((w) => w.productId);
    const cartProductIds = cartItems.map((c) => c.productId);
    const orderedProductIds = userOrders.flatMap((o) => o.items.map((i) => i.productId));

    const res = await fetchConciergeRecommendations({
      mode: 'curated',
      answers: {},
      candidateProducts: publishedAvailableProducts,
      customerContext: {
        wishlistProductIds,
        cartProductIds,
        orderedProductIds,
        recentlyViewedIds: viewedIds,
      },
    });

    setResult(res);
    setIsConsulting(false);
  };

  // Load curated tab automatically when selected if no results yet
  useEffect(() => {
    if (activeMode === 'curated' && !result) {
      handleRunCuratedConsultation();
    }
  }, [activeMode]);

  const handleSwitchTab = (newMode: ConciergeMode) => {
    setActiveMode(newMode);
    setResult(null);
  };

  return (
    <div className="bg-[#F8F6EF] text-[#0B0B0B] min-h-screen">
      {/* Editorial Header */}
      <section className="relative border-b border-[#0B0B0B]/10 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 border border-[#701F36]/30 bg-[#701F36]/5 px-3.5 py-1 text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
            <Sparkles className="h-3.5 w-3.5 text-[#D6B47A]" />
            <span>LUNA ROYALE AI Concierge</span>
          </div>

          <h1 className="mt-5 font-display text-3xl sm:text-5xl font-normal tracking-[0.12em] text-[#0B0B0B]">
            LUNA ROYALE AI CONCIERGE
          </h1>

          <p className="mt-3 font-display text-lg sm:text-xl italic text-[#701F36]">
            “Your personal guide to what’s right for you.”
          </p>

          <p className="mx-auto mt-4 max-w-2xl text-xs sm:text-sm leading-relaxed text-[#0B0B0B]/75">
            Find pieces curated around your style, occasion, or someone special. Every recommendation is verified in real time against our actual atelier collection.
          </p>

          {/* Mode Selector Tabs (Clean, unboxed, zero-pill aesthetic) */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 border-b border-[#0B0B0B]/10 pb-4">
            <button
              type="button"
              onClick={() => handleSwitchTab('style')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
                activeMode === 'style'
                  ? 'bg-[#701F36] text-[#F8F6EF]'
                  : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Personal Style</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('gift')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
                activeMode === 'gift'
                  ? 'bg-[#701F36] text-[#F8F6EF]'
                  : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
              }`}
            >
              <Gift className="h-3.5 w-3.5" />
              <span>Gift Finder</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('curated')}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
                activeMode === 'curated'
                  ? 'bg-[#701F36] text-[#F8F6EF]'
                  : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Curated for You</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Body */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {isLoadingProducts ? (
          <div className="border border-[#0B0B0B]/10 bg-[#F4F1E8]/50 p-16 text-center text-xs text-[#0B0B0B]/60">
            <Sparkles className="mx-auto h-6 w-6 animate-pulse text-[#701F36]" />
            <p className="mt-3">Connecting to LUNA ROYALE atelier catalog...</p>
          </div>
        ) : publishedAvailableProducts.length === 0 ? (
          <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-16 text-center">
            <p className="font-display text-xl text-[#0B0B0B]">
              No products are available for recommendations yet.
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#0B0B0B]/65">
              Our atelier is curating new pieces. Please check back shortly or explore our story.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="mt-6 bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors"
            >
              Explore Shop
            </button>
          </div>
        ) : (
          <div>
            {/* Consultation Form (when result is not shown or user clicks Refine) */}
            {!result && (
              <div className="mx-auto max-w-3xl border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6 sm:p-10 shadow-xs">
                {activeMode === 'style' && (
                  <form onSubmit={handleRunStyleConsultation} className="space-y-8">
                    <div>
                      <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#701F36]">
                        Personal Style Consultation
                      </p>
                      <h2 className="mt-1 font-display text-2xl text-[#0B0B0B]">
                        “Let’s find something that feels like you.”
                      </h2>
                      <p className="mt-1 text-xs text-[#0B0B0B]/70">
                        Answer a few questions to let our AI Concierge match pieces to your personal aesthetic.
                      </p>
                    </div>

                    {/* Question 1: Category */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        What are you shopping for?
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          'Jewelry',
                          'Watches',
                          'Glasses',
                          'Perfume',
                          'Home Fragrance',
                          'Open to suggestions',
                        ].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setStyleCategory(cat)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              styleCategory === cat
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 2: Occasion */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        What is the occasion?
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          'Everyday',
                          'Work',
                          'Date night',
                          'Birthday',
                          'Wedding',
                          'Special event',
                          'Gift',
                          'Home',
                          'No specific occasion',
                        ].map((occ) => (
                          <button
                            key={occ}
                            type="button"
                            onClick={() => setStyleOccasion(occ)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              styleOccasion === occ
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {occ}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 3: Style Preference */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        What style do you prefer?
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          'Minimal',
                          'Elegant',
                          'Bold',
                          'Classic',
                          'Romantic',
                          'Modern',
                          'Dark / sophisticated',
                          'Not sure',
                        ].map((stl) => (
                          <button
                            key={stl}
                            type="button"
                            onClick={() => setStylePreference(stl)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              stylePreference === stl
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {stl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 4: Color Palette */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        What colors do you prefer?
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          'Burgundy',
                          'Black',
                          'Gold',
                          'Silver',
                          'Neutral',
                          'No preference',
                        ].map((clr) => (
                          <button
                            key={clr}
                            type="button"
                            onClick={() => setStyleColor(clr)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              styleColor === clr
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {clr}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 5: Budget */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        What price range are you comfortable with? (NGN / ₦)
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          { id: 'any', label: 'Any budget' },
                          { id: 'under5k', label: 'Under ₦5,000' },
                          { id: '5k-15k', label: '₦5,000 – ₦15,000' },
                          { id: '15k-50k', label: '₦15,000 – ₦50,000' },
                          { id: 'custom', label: 'Custom Maximum' },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setStyleBudgetPreset(b.id)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              styleBudgetPreset === b.id
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>

                      {styleBudgetPreset === 'custom' && (
                        <div className="mt-3">
                          <input
                            type="number"
                            min="1000"
                            step="500"
                            value={styleCustomBudget}
                            onChange={(e) => setStyleCustomBudget(e.target.value)}
                            placeholder="Enter maximum budget in Naira (e.g. 25000)"
                            className="w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#0B0B0B]/10">
                      <button
                        type="submit"
                        disabled={isConsulting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#701F36] px-8 py-3.5 text-xs font-medium tracking-[0.16em] text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
                      >
                        {isConsulting ? (
                          <span>Consulting Atelier...</span>
                        ) : (
                          <>
                            <span>Discover Your Edit</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {activeMode === 'gift' && (
                  <form onSubmit={handleRunGiftConsultation} className="space-y-8">
                    <div>
                      <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#701F36]">
                        Gift Finder Consultation
                      </p>
                      <h2 className="mt-1 font-display text-2xl text-[#0B0B0B]">
                        “Find a gift for someone special.”
                      </h2>
                      <p className="mt-1 text-xs text-[#0B0B0B]/70">
                        Select recipient and celebration details to find verified LUNA ROYALE pieces suitable for gifting.
                      </p>
                    </div>

                    {/* Question 1: Recipient */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        Who are you shopping for?
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          'Partner',
                          'Mother',
                          'Father',
                          'Friend',
                          'Sister',
                          'Brother',
                          'Child',
                          'Colleague',
                          'Someone special',
                        ].map((rec) => (
                          <button
                            key={rec}
                            type="button"
                            onClick={() => setGiftRecipient(rec)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              giftRecipient === rec
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {rec}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 2: Occasion */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        What is the occasion?
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          'Birthday',
                          'Anniversary',
                          'Wedding',
                          "Valentine's Day",
                          'Christmas',
                          'Graduation',
                          'Celebration',
                          'Just because',
                        ].map((occ) => (
                          <button
                            key={occ}
                            type="button"
                            onClick={() => setGiftOccasion(occ)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              giftOccasion === occ
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {occ}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 3: Style preference */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        What style might they like?
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          'Elegant',
                          'Minimal',
                          'Bold',
                          'Classic',
                          'Romantic',
                          'Modern',
                          'Not sure',
                        ].map((stl) => (
                          <button
                            key={stl}
                            type="button"
                            onClick={() => setGiftStyle(stl)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              giftStyle === stl
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {stl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 4: Preference (One item, set, box) */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        Would you prefer:
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          'One item',
                          'A set',
                          'A gift box',
                          'Open to suggestions',
                        ].map((tp) => (
                          <button
                            key={tp}
                            type="button"
                            onClick={() => setGiftType(tp)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              giftType === tp
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {tp}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 5: Budget */}
                    <div>
                      <label className="block text-xs font-medium text-[#0B0B0B] mb-2.5">
                        What is your budget? (NGN / ₦)
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          { id: 'any', label: 'Any budget' },
                          { id: 'under5k', label: 'Under ₦5,000' },
                          { id: '5k-15k', label: '₦5,000 – ₦15,000' },
                          { id: '15k-50k', label: '₦15,000 – ₦50,000' },
                          { id: 'custom', label: 'Custom Maximum' },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setGiftBudgetPreset(b.id)}
                            className={`border px-3 py-2.5 text-xs text-left transition-colors ${
                              giftBudgetPreset === b.id
                                ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF] font-medium'
                                : 'border-[#0B0B0B]/15 bg-white text-[#0B0B0B] hover:border-[#701F36]'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>

                      {giftBudgetPreset === 'custom' && (
                        <div className="mt-3">
                          <input
                            type="number"
                            min="1000"
                            step="500"
                            value={giftCustomBudget}
                            onChange={(e) => setGiftCustomBudget(e.target.value)}
                            placeholder="Enter maximum budget in Naira"
                            className="w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#0B0B0B]/10">
                      <button
                        type="submit"
                        disabled={isConsulting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#701F36] px-8 py-3.5 text-xs font-medium tracking-[0.16em] text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
                      >
                        {isConsulting ? (
                          <span>Finding Gifts...</span>
                        ) : (
                          <>
                            <span>Find Ideal Gifts</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {activeMode === 'curated' && (
                  <div className="py-8 text-center space-y-4">
                    <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#701F36]">
                      Personalized Recommendation
                    </p>
                    <h2 className="font-display text-2xl text-[#0B0B0B]">
                      “Curated for You”
                    </h2>
                    <p className="mx-auto max-w-md text-xs leading-relaxed text-[#0B0B0B]/70">
                      {user
                        ? `Welcome back, ${user.fullName || 'Client'}. We analyze your saved wishlist items, cart selections, and browsing history to curate an exclusive edit.`
                        : 'Explore LUNA ROYALE and we’ll use your preferences to curate recommendations for you.'}
                    </p>
                    <button
                      type="button"
                      disabled={isConsulting}
                      onClick={handleRunCuratedConsultation}
                      className="inline-flex items-center gap-2 bg-[#701F36] px-8 py-3.5 text-xs font-medium tracking-[0.16em] text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4 text-[#D6B47A]" />
                      <span>{isConsulting ? 'Curating Selection...' : 'Generate My Curation'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Results Presentation */}
            {result && (
              <div className="space-y-10">
                {/* Result Hero Header */}
                <div className="border border-[#701F36]/20 bg-[#F4F1E8]/70 p-6 sm:p-10 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#0B0B0B]/10 pb-6">
                    <div>
                      <div className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase text-[#701F36]">
                        <Sparkles className="h-3.5 w-3.5 text-[#D6B47A]" />
                        <span>LUNA ROYALE AI Concierge Edit</span>
                      </div>
                      <h2 className="mt-1 font-display text-2xl sm:text-3xl text-[#0B0B0B]">
                        {result.headline}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      className="inline-flex items-center gap-1.5 self-start sm:self-auto border border-[#0B0B0B]/20 bg-white px-4 py-2 text-xs font-medium text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Refine Preferences</span>
                    </button>
                  </div>

                  <p className="mt-4 font-display text-sm sm:text-base italic leading-relaxed text-[#0B0B0B]/85 max-w-3xl">
                    “{result.conciergeNote}”
                  </p>
                </div>

                {/* Recommendations Grid */}
                {result.isNoMatch || result.recommendations.length === 0 ? (
                  <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-16 text-center space-y-3">
                    <HelpCircle className="mx-auto h-8 w-8 text-[#701F36]/70" />
                    <h3 className="font-display text-xl text-[#0B0B0B]">
                      We couldn’t find a perfect match from our current collection.
                    </h3>
                    <p className="mx-auto max-w-md text-xs leading-relaxed text-[#0B0B0B]/65">
                      {result.noMatchExplanation ||
                        'Our artisans only recommend pieces currently available in the atelier. You may adjust your budget or explore our jewelry and accessories.'}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setResult(null)}
                        className="bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors"
                      >
                        Adjust Answers
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('shop')}
                        className="border border-[#0B0B0B]/20 bg-white px-6 py-3 text-xs font-medium tracking-wider text-[#0B0B0B] uppercase hover:border-[#701F36] hover:text-[#701F36] transition-colors"
                      >
                        Explore Full Shop
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between border-b border-[#0B0B0B]/10 pb-4 mb-8">
                      <p className="text-xs tracking-[0.16em] uppercase text-[#0B0B0B]/70 font-medium">
                        Recommended Pieces ({result.recommendations.length})
                      </p>
                      <span className="text-xs text-[#0B0B0B]/50">
                        Verified Firestore Catalog
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                      {result.recommendations.map((rec) => {
                        const product = productMap.get(rec.productId);
                        if (!product) return null;

                        return (
                          <div key={rec.productId} className="flex flex-col justify-between space-y-3">
                            {/* Concierge Reason Banner */}
                            <div className="border border-[#701F36]/20 bg-[#F4F1E8] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#701F36]">
                              <span className="font-semibold uppercase tracking-wider block text-[10px] text-[#701F36]/80 mb-0.5">
                                Concierge Note
                              </span>
                              {rec.reason}
                            </div>

                            {/* Standard Product Card */}
                            <div className="flex-1">
                              <ProductCard
                                product={product}
                                isWishlisted={wishlistIds.has(product.id)}
                                onToggleWishlist={onToggleWishlist}
                                onAddToCart={onAddToCart}
                                onSelectProduct={onSelectProduct}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-14 border-t border-[#0B0B0B]/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-[#0B0B0B]/60 italic">
                        Interested in custom curations? Our concierge is available for assistance anytime.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setResult(null)}
                          className="border border-[#0B0B0B]/20 bg-white px-5 py-2.5 text-xs font-medium text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors"
                        >
                          Restart Consultation
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate('shop')}
                          className="bg-[#701F36] px-5 py-2.5 text-xs font-medium text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors"
                        >
                          Browse All Pieces
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
