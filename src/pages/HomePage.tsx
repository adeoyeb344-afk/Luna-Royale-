import React, { useMemo } from 'react';
import { ArrowRight, Globe } from 'lucide-react';
import {
  AppSection,
  Box,
  Collection,
  OFFICIAL_BOXES,
  OFFICIAL_CATEGORIES,
  OFFICIAL_COLLECTIONS,
  OfficialCategory,
  Product,
} from '../types';
import { formatNaira } from '../services/firestoreService';
import { ProductCard } from '../components/ProductCard';
import { ProductMedia } from '../components/ProductMedia';

interface HomePageProps {
  products: Product[];
  collections: Collection[];
  boxes: Box[];
  isLoadingProducts: boolean;
  wishlistIds: Set<string>;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (productId: string) => void;
  onNavigate: (section: AppSection) => void;
  onSelectCollection: (collectionId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  collections,
  boxes,
  isLoadingProducts,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
  onNavigate,
  onSelectCollection,
}) => {
  const publishedProducts = useMemo(
    () => products.filter((p) => p.published),
    [products]
  );

  const featuredProducts = useMemo(
    () => publishedProducts.slice(0, 6),
    [publishedProducts]
  );

  // Guarantee all 6 official collections with any updates from Firestore
  const displayCollections = useMemo(() => {
    return OFFICIAL_COLLECTIONS.map((official) => {
      const fromDb = collections.find((c) => c.id === official.id);
      return fromDb
        ? {
            ...official,
            ...fromDb,
            name: fromDb.name || official.name,
            description: fromDb.description || official.description,
            productIds: Array.isArray(fromDb.productIds)
              ? fromDb.productIds
              : official.productIds,
          }
        : official;
    });
  }, [collections]);

  // Guarantee all 5 official Boxes & Sets with any updates from Firestore
  const displayBoxes = useMemo(() => {
    return OFFICIAL_BOXES.map((official) => {
      const fromDb = boxes.find((b) => b.id === official.id);
      return fromDb
        ? {
            ...official,
            ...fromDb,
            name: fromDb.name || official.name,
            composition: fromDb.composition || official.composition,
            description: fromDb.description || official.description,
            price: typeof fromDb.price === 'number' ? fromDb.price : official.price,
            productIds: Array.isArray(fromDb.productIds)
              ? fromDb.productIds
              : official.productIds,
            images:
              Array.isArray(fromDb.images) && fromDb.images.length > 0
                ? fromDb.images
                : official.images,
          }
        : official;
    });
  }, [boxes]);

  // Official 5 categories required by LUNA ROYALE
  const categoryDirectory: Array<{
    name: string;
    internalCategory: OfficialCategory;
    navSlug: AppSection;
    subtitle: string;
  }> = [
    {
      name: 'Jewelry',
      internalCategory: 'Jewelry',
      navSlug: 'jewelry',
      subtitle: 'Fine adornments crafted for timeless distinction.',
    },
    {
      name: 'Watches',
      internalCategory: 'Watches',
      navSlug: 'watches',
      subtitle: 'Precision horology and enduring silhouettes.',
    },
    {
      name: 'Glasses',
      internalCategory: 'Glasses',
      navSlug: 'eyewear',
      subtitle: 'Architectural frames and optical refinement.',
    },
    {
      name: 'Perfume',
      internalCategory: 'Perfume',
      navSlug: 'fragrance',
      subtitle: 'Signature olfactory compositions.',
    },
    {
      name: 'Home Fragrance',
      internalCategory: 'Home Fragrance',
      navSlug: 'royale-home',
      subtitle: 'Sensory atmosphere, artisanal candles and diffusers.',
    },
  ];

  return (
    <div className="bg-[#F8F6EF] text-[#0B0B0B]">
      {/* ================================================================ */}
      {/* 1. HERO                                                          */}
      {/* LUNA ROYALE                                                      */}
      {/* ELEGANCE, CURATED.                                               */}
      {/* Short supporting copy, Explore Shop, View Collections            */}
      {/* Image-free, spacious, premium, mobile-first                      */}
      {/* ================================================================ */}
      <section className="relative py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="font-sans text-xs sm:text-sm tracking-[0.24em] text-[#701F36] uppercase font-medium">
              LUNA ROYALE
            </p>

            <h1 className="mt-4 font-display text-4xl sm:text-6xl lg:text-7xl font-normal tracking-[0.14em] text-[#0B0B0B] uppercase">
              ELEGANCE, CURATED.
            </h1>

            <p className="mt-6 font-sans text-sm sm:text-base leading-relaxed text-[#0B0B0B]/75 font-normal max-w-xl">
              Jewelry, watches, fragrance and considered pieces for every generation.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="inline-flex items-center gap-3 bg-[#701F36] px-8 py-4 text-xs font-sans font-medium tracking-[0.18em] text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors duration-150 whitespace-nowrap"
              >
                <span>Explore Shop</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('collections')}
                className="inline-flex items-center gap-2 border border-[#0B0B0B]/25 bg-transparent px-8 py-4 text-xs font-sans font-medium tracking-[0.18em] text-[#0B0B0B] uppercase hover:border-[#701F36] hover:text-[#701F36] transition-colors duration-150 whitespace-nowrap"
              >
                <span>View Collections</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Section Divider: Hero → Shop by Category */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden="true">
        <div className="border-t border-[#0B0B0B]/10" />
      </div>

      {/* ================================================================ */}
      {/* 2. SHOP BY CATEGORY                                              */}
      {/* Jewelry, Watches, Glasses, Perfume, Home Fragrance              */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h2 className="font-display text-2xl sm:text-3xl font-normal tracking-[0.16em] text-[#0B0B0B] uppercase">
              SHOP BY CATEGORY
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="inline-flex items-center gap-2 font-sans text-xs font-medium tracking-[0.16em] text-[#0B0B0B] uppercase hover:text-[#701F36] transition-colors whitespace-nowrap"
            >
              <span>Browse Full Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-[#0B0B0B]/10 border border-[#0B0B0B]/10">
            {categoryDirectory.map((cat, idx) => {
              const count = publishedProducts.filter(
                (p) => p.category === cat.internalCategory
              ).length;

              return (
                <button
                  key={cat.internalCategory}
                  type="button"
                  onClick={() => onNavigate(cat.navSlug)}
                  className="group flex flex-col justify-between bg-[#F8F6EF] p-6 sm:p-7 text-left transition-colors duration-150 hover:bg-[#F4F1E8]"
                >
                  <div>
                    <span className="font-mono text-xs tabular-nums text-[#0B0B0B]/40">
                      0{idx + 1}
                    </span>
                    <h3 className="mt-4 font-display text-lg font-medium tracking-wider text-[#0B0B0B] group-hover:text-[#701F36] transition-colors">
                      {cat.name}
                    </h3>
                    <p className="mt-2 font-sans text-xs leading-relaxed text-[#0B0B0B]/65">
                      {cat.subtitle}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-[#0B0B0B]/10 pt-4 font-sans text-xs text-[#0B0B0B]/60">
                    <span className="tabular-nums">
                      {count === 0 ? 'Awaiting release' : `${count} ${count === 1 ? 'piece' : 'pieces'}`}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#701F36] transition-transform duration-150 group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subtle Section Divider: Shop by Category → Curated Collections */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden="true">
        <div className="border-t border-[#0B0B0B]/10" />
      </div>

      {/* ================================================================ */}
      {/* 3. CURATED COLLECTIONS                                           */}
      {/* The 6 existing LUNA ROYALE collections from Firestore            */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-sans text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
                Signature Series
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-[0.16em] text-[#0B0B0B] uppercase">
                CURATED COLLECTIONS
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('collections')}
              className="inline-flex items-center gap-2 font-sans text-xs font-medium tracking-[0.16em] text-[#0B0B0B] uppercase hover:text-[#701F36] transition-colors whitespace-nowrap"
            >
              <span>View All Collections</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCollections.map((col) => {
              const colProducts = publishedProducts.filter(
                (p) =>
                  col.productIds.includes(p.id) ||
                  p.collectionIds.includes(col.id)
              );

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => onSelectCollection(col.id)}
                  className="group flex flex-col justify-between border border-[#0B0B0B]/10 bg-[#F4F1E8]/50 p-6 sm:p-8 text-left transition-colors duration-150 hover:border-[#701F36] hover:bg-[#F4F1E8]"
                >
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-medium tracking-wider text-[#0B0B0B] group-hover:text-[#701F36] transition-colors">
                      {col.name}
                    </h3>
                    <p className="mt-2 font-sans text-xs leading-relaxed text-[#0B0B0B]/70">
                      {col.description}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-[#0B0B0B]/10 pt-4 font-sans text-xs text-[#0B0B0B]/60">
                    <span className="tabular-nums">
                      {colProducts.length > 0
                        ? `${colProducts.length} ${
                            colProducts.length === 1 ? 'piece' : 'pieces'
                          }`
                        : 'Curating'}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#0B0B0B]/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#701F36]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subtle Section Divider: Curated Collections → Curated Gift Sets */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden="true">
        <div className="border-t border-[#0B0B0B]/10" />
      </div>

      {/* ================================================================ */}
      {/* 4. CURATED GIFT SETS                                             */}
      {/* The 5 existing Boxes & Sets from Firestore                       */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-sans text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
                Boxes & Sets
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-[0.16em] text-[#0B0B0B] uppercase">
                CURATED GIFT SETS
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('gift-sets')}
              className="inline-flex items-center gap-2 font-sans text-xs font-medium tracking-[0.16em] text-[#0B0B0B] uppercase hover:text-[#701F36] transition-colors whitespace-nowrap"
            >
              <span>Explore All Sets</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayBoxes.map((box) => {
              const hasCover = Array.isArray(box.images) && box.images.length > 0 && box.images[0];

              return (
                <button
                  key={box.id}
                  type="button"
                  onClick={() => onNavigate('gift-sets')}
                  className="group flex flex-col justify-between border border-[#0B0B0B]/10 bg-[#F4F1E8]/50 p-6 sm:p-7 text-left transition-colors duration-150 hover:border-[#701F36] hover:bg-[#F4F1E8]"
                >
                  <div>
                    {hasCover && (
                      <div className="mb-5 aspect-[4/3] w-full overflow-hidden bg-[#0B0B0B]/5">
                        <ProductMedia
                          src={box.images[0]}
                          alt={box.name}
                          aspectClassName="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <h3 className="font-display text-base sm:text-lg font-medium tracking-wider text-[#0B0B0B] group-hover:text-[#701F36] transition-colors">
                      {box.name}
                    </h3>
                    <p className="mt-1 font-sans text-xs font-medium tracking-wide text-[#701F36] uppercase">
                      {box.composition}
                    </p>
                    <p className="mt-2 font-sans text-xs leading-relaxed text-[#0B0B0B]/70">
                      {box.description}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-[#0B0B0B]/10 pt-4 font-sans text-xs text-[#0B0B0B]/60">
                    <div>
                      {box.price !== null ? (
                        <span className="font-display text-sm font-semibold tabular-nums text-[#701F36]">
                          {formatNaira(box.price)}
                        </span>
                      ) : (
                        <span className="text-[11px] tracking-wide text-[#0B0B0B]/50 uppercase">
                          Atelier curation
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#0B0B0B]/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#701F36]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subtle Section Divider: Curated Gift Sets → Featured Products */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden="true">
        <div className="border-t border-[#0B0B0B]/10" />
      </div>

      {/* ================================================================ */}
      {/* 5. FEATURED PRODUCTS                                             */}
      {/* Real published Firestore products only                           */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-sans text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
                The Selection
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-[0.16em] text-[#0B0B0B] uppercase">
                FEATURED PRODUCTS
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="inline-flex items-center gap-2 font-sans text-xs font-medium tracking-[0.16em] text-[#0B0B0B] uppercase hover:text-[#701F36] transition-colors whitespace-nowrap"
            >
              <span>Enter Shop</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-10">
            {isLoadingProducts ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((skeleton) => (
                  <div
                    key={skeleton}
                    className="border border-[#0B0B0B]/10 bg-[#F2EFE6]/60 p-6 animate-pulse"
                  >
                    <div className="aspect-[3/4] w-full bg-[#0B0B0B]/5" />
                    <div className="mt-4 h-3 w-24 bg-[#0B0B0B]/10" />
                    <div className="mt-2 h-5 w-48 bg-[#0B0B0B]/10" />
                  </div>
                ))}
              </div>
            ) : featuredProducts.length === 0 ? (
              <div className="border border-[#0B0B0B]/10 bg-[#F4F1E8]/50 px-6 py-16 text-center">
                <p className="font-display text-lg text-[#0B0B0B]">
                  No products available yet.
                </p>
                <p className="mx-auto mt-2 max-w-md font-sans text-xs leading-relaxed text-[#0B0B0B]/65">
                  The official LUNA ROYALE catalog is currently being prepared. Verified pieces will appear here as soon as they are published.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {featuredProducts.map((product) => (
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
      </section>

      {/* Subtle Section Divider: Featured Products → Subtle Service Information */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden="true">
        <div className="border-t border-[#0B0B0B]/10" />
      </div>

      {/* ================================================================ */}
      {/* 6. SUBTLE SERVICE INFORMATION                                    */}
      {/* Worldwide shipping available.                                    */}
      {/* ================================================================ */}
      <section className="py-12 sm:py-16 bg-[#F4F1E8]/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-[#701F36] shrink-0" />
              <span className="font-sans text-xs tracking-[0.18em] text-[#0B0B0B] uppercase font-medium">
                Worldwide shipping available.
              </span>
            </div>
            <p className="font-sans text-xs text-[#0B0B0B]/65 max-w-md">
              Each piece is individually inspected, registered, and presented in signature LUNA ROYALE atelier packaging.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
