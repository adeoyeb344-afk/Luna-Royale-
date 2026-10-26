import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import {
  formatNaira,
  getAvailabilityLabel,
  getCustomerCategoryLabel,
} from '../services/firestoreService';
import { ProductMedia } from './ProductMedia';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
}) => {
  const categoryLabel = getCustomerCategoryLabel(product.category);
  const availabilityLabel = getAvailabilityLabel(product.availability);
  const isOutOfStock = product.availability === 'out_of_stock';
  const primaryImage = product.images.length > 0 ? product.images[0] : null;

  return (
    <article className="group flex flex-col justify-between bg-[#F8F6EF] transition-transform duration-150 ease-out hover:-translate-y-0.5">
      <div>
        <div className="relative">
          <button
            type="button"
            onClick={() => onSelectProduct(product.id)}
            className="block w-full text-left focus:outline-none"
            aria-label={`View details for ${product.name}`}
          >
            <ProductMedia
              src={primaryImage}
              alt={product.name}
              categoryLabel={categoryLabel}
              aspectClassName="aspect-[3/4]"
            />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            aria-label={
              isWishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center bg-[#F8F6EF]/90 text-[#0B0B0B] transition-colors duration-150 hover:bg-[#F8F6EF] hover:text-[#701F36]"
          >
            <Heart
              className={`h-4 w-4 ${
                isWishlisted ? 'fill-[#701F36] text-[#701F36]' : 'text-[#0B0B0B]'
              }`}
            />
          </button>
        </div>

        {/* Clean unboxed metadata with typographic separator (Zero-Pill Discipline) */}
        <div className="mt-4 flex items-center gap-2 text-xs text-[#0B0B0B]/60">
          <span>{categoryLabel}</span>
          <span aria-hidden="true">·</span>
          <span
            className={
              isOutOfStock
                ? 'text-[#701F36]'
                : product.availability === 'limited'
                  ? 'text-[#0B0B0B]/80'
                  : 'text-[#0B0B0B]/60'
            }
          >
            {availabilityLabel}
          </span>
        </div>

        <h3 className="mt-1.5 font-display text-base font-medium tracking-wide text-[#0B0B0B]">
          <button
            type="button"
            onClick={() => onSelectProduct(product.id)}
            className="text-left hover:text-[#701F36] transition-colors"
          >
            {product.name}
          </button>
        </h3>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#0B0B0B]/10 pt-3">
        <span className="text-[15px] font-medium tabular-nums text-[#0B0B0B]">
          {formatNaira(product.price)}
        </span>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={() => onAddToCart(product)}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap transition-colors duration-150 ${
            isOutOfStock
              ? 'cursor-not-allowed text-[#0B0B0B]/35'
              : 'bg-[#701F36] text-[#F8F6EF] hover:bg-[#0B0B0B]'
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
        </button>
      </div>
    </article>
  );
};
