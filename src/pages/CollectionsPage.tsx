import React from 'react';
import { Collection, Product } from '../types';
import { ProductCard } from '../components/ProductCard';

interface CollectionsPageProps {
  collections: Collection[];
  products: Product[];
  selectedCollectionId: string | null;
  onSelectCollection: (collectionId: string | null) => void;
  wishlistIds: Set<string>;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (productId: string) => void;
}

export const CollectionsPage: React.FC<CollectionsPageProps> = ({
  collections,
  products,
  selectedCollectionId,
  onSelectCollection,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
}) => {
  const publishedProducts = products.filter((p) => p.published);
  const activeCollection = selectedCollectionId
    ? collections.find((c) => c.id === selectedCollectionId) || null
    : null;

  const getCollectionProducts = (col: Collection): Product[] =>
    publishedProducts.filter(
      (p) => col.productIds.includes(p.id) || p.collectionIds.includes(col.id)
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="border-b border-[#0B0B0B]/12 pb-8">
        <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
          LUNA ROYALE Curations
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-normal tracking-wide text-[#0B0B0B]">
          Official Collections
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#0B0B0B]/70">
          Distinctive thematic worlds curated across our jewelry, watch, eyewear, fragrance, and Royale Home lines.
        </p>

        {/* Interactive Collection Selector Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectCollection(null)}
            className={`px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
              !activeCollection
                ? 'bg-[#701F36] text-[#F8F6EF]'
                : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36] hover:text-[#701F36]'
            }`}
          >
            All Collections
          </button>
          {collections.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => onSelectCollection(col.id)}
              className={`px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
                activeCollection?.id === col.id
                  ? 'bg-[#701F36] text-[#F8F6EF]'
                  : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36] hover:text-[#701F36]'
              }`}
            >
              {col.name}
            </button>
          ))}
        </div>
      </div>

      {activeCollection ? (
        <div className="mt-12">
          <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/60 p-8">
            <h2 className="font-display text-2xl tracking-wider text-[#0B0B0B]">
              {activeCollection.name}
            </h2>
            <p className="mt-2 text-sm text-[#0B0B0B]/70">
              {activeCollection.description}
            </p>
          </div>

          <div className="mt-10">
            {(() => {
              const items = getCollectionProducts(activeCollection);
              if (items.length === 0) {
                return (
                  <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/40 px-6 py-16 text-center">
                    <p className="font-display text-lg text-[#0B0B0B]">
                      No products available yet.
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#0B0B0B]/60">
                      {activeCollection.name} will display its curated selection once real products are associated by an administrator.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((product) => (
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
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="mt-12 space-y-16">
          {collections.map((col, idx) => {
            const colProducts = getCollectionProducts(col);
            return (
              <section
                key={col.id}
                className="border-b border-[#0B0B0B]/10 pb-12 last:border-b-0"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <span className="font-mono text-xs tabular-nums text-[#701F36]">
                      0{idx + 1}
                    </span>
                    <h2 className="mt-1 font-display text-xl sm:text-2xl font-normal tracking-wider text-[#0B0B0B]">
                      {col.name}
                    </h2>
                    <p className="mt-1.5 text-sm text-[#0B0B0B]/70">
                      {col.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCollection(col.id)}
                    className="self-start sm:self-auto border border-[#0B0B0B]/20 px-4 py-2 text-xs font-medium tracking-wider text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors whitespace-nowrap"
                  >
                    Explore Collection ({colProducts.length})
                  </button>
                </div>

                {colProducts.length === 0 ? (
                  <div className="mt-6 border border-[#0B0B0B]/10 bg-[#F4F1E8]/40 p-8 text-center">
                    <p className="font-display text-sm text-[#0B0B0B]/80">
                      No products available yet.
                    </p>
                    <p className="mt-1 text-xs text-[#0B0B0B]/55">
                      Awaiting product association by an administrator.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {colProducts.slice(0, 3).map((product) => (
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
