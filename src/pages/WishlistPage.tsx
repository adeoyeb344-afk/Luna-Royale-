import React from 'react';
import { Heart } from 'lucide-react';
import { AppSection, Product } from '../types';
import { ProductCard } from '../components/ProductCard';

interface WishlistPageProps {
  products: Product[];
  wishlistIds: Set<string>;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (productId: string) => void;
  onNavigate: (section: AppSection) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  products,
  wishlistIds,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
  onNavigate,
}) => {
  const wishlistedProducts = products.filter(
    (p) => p.published && wishlistIds.has(p.id)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="border-b border-[#0B0B0B]/12 pb-8">
        <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
          Personal Curation
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-normal tracking-wide text-[#0B0B0B]">
          Wishlist
        </h1>
      </div>

      <div className="mt-10">
        {wishlistedProducts.length === 0 ? (
          <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-[#0B0B0B]/15 text-[#701F36]">
              <Heart className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg text-[#0B0B0B]">
              Your wishlist is empty
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#0B0B0B]/65">
              Add products you love to see them here
            </p>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="mt-6 bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors whitespace-nowrap"
            >
              Explore Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {wishlistedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={true}
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
