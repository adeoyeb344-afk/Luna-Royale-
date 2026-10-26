import React, { useState } from 'react';
import { Search } from 'lucide-react';
import {
  AppSection,
  Collection,
  OFFICIAL_CATEGORIES,
  OfficialCategory,
  Product,
} from '../types';
import { getCustomerCategoryLabel } from '../services/firestoreService';
import { ProductCard } from '../components/ProductCard';

interface ShopPageProps {
  activeSection: AppSection;
  products: Product[];
  collections: Collection[];
  isLoading: boolean;
  error: string | null;
  wishlistIds: Set<string>;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (productId: string) => void;
  onNavigate: (section: AppSection) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  activeSection,
  products,
  collections,
  isLoading,
  error,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
  onNavigate,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in_stock'>('all');

  // Map active navigation section to underlying official category if applicable
  const activeCategoryMapping = OFFICIAL_CATEGORIES.find(
    (c) => c.navSlug === activeSection
  );
  const activeInternalCategory: OfficialCategory | null =
    activeCategoryMapping ? activeCategoryMapping.internalCategory : null;

  const publishedProducts = products.filter((p) => p.published);

  // Filter by category first
  const categoryFiltered = activeInternalCategory
    ? publishedProducts.filter((p) => p.category === activeInternalCategory)
    : publishedProducts;

  // Filter by collection
  const collectionFiltered =
    selectedCollectionId === 'all'
      ? categoryFiltered
      : categoryFiltered.filter((p) => {
          const col = collections.find((c) => c.id === selectedCollectionId);
          return (
            p.collectionIds.includes(selectedCollectionId) ||
            Boolean(col?.productIds.includes(p.id))
          );
        });

  // Filter by availability
  const availabilityFiltered =
    availabilityFilter === 'in_stock'
      ? collectionFiltered.filter((p) => p.availability !== 'out_of_stock')
      : collectionFiltered;

  // Filter by search text
  const cleanQuery = searchFilter.trim().toLowerCase();
  const finalProducts = cleanQuery
    ? availabilityFiltered.filter((p) => {
        const customerLabel = getCustomerCategoryLabel(p.category).toLowerCase();
        return (
          p.name.toLowerCase().includes(cleanQuery) ||
          p.category.toLowerCase().includes(cleanQuery) ||
          customerLabel.includes(cleanQuery) ||
          p.description.toLowerCase().includes(cleanQuery)
        );
      })
    : availabilityFiltered;

  const pageTitle = activeCategoryMapping
    ? activeCategoryMapping.customerLabel
    : 'Shop All';

  const pageSubtitle = activeCategoryMapping
    ? activeCategoryMapping.subtitle
    : 'Explore the complete LUNA ROYALE collection of fine jewelry, watches, eyewear, fragrance, and Royale Home.';

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Header */}
      <div className="border-b border-[#0B0B0B]/12 pb-8">
        <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
          LUNA ROYALE Catalog
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-normal tracking-wide text-[#0B0B0B]">
          {pageTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#0B0B0B]/70">
          {pageSubtitle}
        </p>

        {/* Interactive Category Switcher Bar */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className={`px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
              activeSection === 'shop'
                ? 'bg-[#701F36] text-[#F8F6EF]'
                : 'border border-[#0B0B0B]/15 bg-transparent text-[#0B0B0B]/80 hover:border-[#701F36] hover:text-[#701F36]'
            }`}
          >
            All Categories
          </button>
          {OFFICIAL_CATEGORIES.map((cat) => (
            <button
              key={cat.internalCategory}
              type="button"
              onClick={() => onNavigate(cat.navSlug)}
              className={`px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
                activeSection === cat.navSlug
                  ? 'bg-[#701F36] text-[#F8F6EF]'
                  : 'border border-[#0B0B0B]/15 bg-transparent text-[#0B0B0B]/80 hover:border-[#701F36] hover:text-[#701F36]'
              }`}
            >
              {cat.customerLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#0B0B0B]/40" />
          <input
            type="search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search products..."
            aria-label="Search within current view"
            className="w-full border border-[#0B0B0B]/20 bg-white py-2.5 pr-3 pl-10 text-xs text-[#0B0B0B] placeholder:text-[#0B0B0B]/45 focus:border-[#701F36] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[#0B0B0B]/70">
            <span>Collection:</span>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
            >
              <option value="all">All Collections</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-[#0B0B0B]/70">
            <span>Availability:</span>
            <select
              value={availabilityFilter}
              onChange={(e) =>
                setAvailabilityFilter(e.target.value as 'all' | 'in_stock')
              }
              className="border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
            >
              <option value="all">All Pieces</option>
              <option value="in_stock">Available Only</option>
            </select>
          </label>
        </div>
      </div>

      {/* Product Grid or Intentional Empty State */}
      <div className="mt-10">
        {error ? (
          <div className="border border-[#701F36]/30 bg-[#701F36]/5 p-8 text-center">
            <p className="font-display text-base text-[#701F36]">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="border border-[#0B0B0B]/10 bg-[#F2EFE6]/60 p-6 animate-pulse"
              >
                <div className="aspect-[3/4] w-full bg-[#0B0B0B]/5" />
                <div className="mt-4 h-3 w-24 bg-[#0B0B0B]/10" />
                <div className="mt-2 h-5 w-48 bg-[#0B0B0B]/10" />
              </div>
            ))}
          </div>
        ) : finalProducts.length === 0 ? (
          <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-20 text-center">
            {cleanQuery.length > 0 ? (
              <>
                <p className="font-display text-lg text-[#0B0B0B]">
                  No products found.
                </p>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#0B0B0B]/65">
                  No published products match "{searchFilter}".
                </p>
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="mt-6 border border-[#0B0B0B]/25 px-5 py-2.5 text-xs font-medium tracking-wider text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors"
                >
                  Clear Search
                </button>
              </>
            ) : (
              <>
                <p className="font-display text-lg text-[#0B0B0B]">
                  No products available yet.
                </p>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#0B0B0B]/65">
                  {activeCategoryMapping
                    ? `No ${activeCategoryMapping.customerLabel.toLowerCase()} pieces have been published yet.`
                    : 'No products have been published to the catalog yet.'}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {finalProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlistIds.has(product.id)}
                onToggleWishlist={onToggleWishlist}
                onAddToCart={onAddToCart}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
