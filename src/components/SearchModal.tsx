import React, { useEffect, useRef, useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { formatNaira, getCustomerCategoryLabel } from '../services/firestoreService';
import { ProductMedia } from './ProductMedia';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (productId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}) => {
  const [queryText, setQueryText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQueryText('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = queryText.trim().toLowerCase();
  const publishedProducts = products.filter((p) => p.published);

  const matchingProducts = trimmed
    ? publishedProducts.filter((p) => {
        const customerCat = getCustomerCategoryLabel(p.category).toLowerCase();
        return (
          p.name.toLowerCase().includes(trimmed) ||
          p.category.toLowerCase().includes(trimmed) ||
          customerCat.includes(trimmed) ||
          p.description.toLowerCase().includes(trimmed)
        );
      })
    : publishedProducts;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#0B0B0B]/60 backdrop-blur-[2px] p-4 sm:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Search LUNA ROYALE catalog"
    >
      <div className="w-full max-w-3xl bg-[#F8F6EF] border border-[#0B0B0B]/15 p-6 sm:p-8 my-8">
        <div className="flex items-center justify-between border-b border-[#0B0B0B]/10 pb-4">
          <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
            Search Catalog
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-10 w-10 items-center justify-center text-[#0B0B0B]/70 hover:text-[#701F36] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#0B0B0B]/45" />
          <input
            ref={inputRef}
            type="search"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search by product name, Jewelry, Watches, Eyewear, Fragrance, Royale Home..."
            aria-label="Search products"
            className="w-full border border-[#0B0B0B]/20 bg-white py-3.5 pr-4 pl-11 text-sm text-[#0B0B0B] placeholder:text-[#0B0B0B]/40 focus:border-[#701F36] focus:outline-none"
          />
        </div>

        <div className="mt-8">
          {matchingProducts.length === 0 ? (
            <div className="py-12 text-center border border-[#0B0B0B]/8 bg-[#F4F1E8]/60">
              <p className="font-display text-base text-[#0B0B0B]">
                No products found.
              </p>
              <p className="mt-1.5 text-xs text-[#0B0B0B]/60">
                {publishedProducts.length === 0
                  ? 'The catalog currently contains no published products.'
                  : 'Try adjusting your search terms or browse our curated categories.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#0B0B0B]/10 max-h-[55vh] overflow-y-auto">
              {matchingProducts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectProduct(item.id);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-[#0B0B0B]/[0.02] transition-colors px-2"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-14 shrink-0">
                      <ProductMedia
                        src={item.images[0] || null}
                        alt={item.name}
                        aspectClassName="h-16 w-14"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-[#0B0B0B]/55">
                        {getCustomerCategoryLabel(item.category)}
                      </p>
                      <p className="mt-0.5 font-display text-sm font-medium text-[#0B0B0B]">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs font-medium tabular-nums text-[#701F36]">
                        {formatNaira(item.price)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#0B0B0B]/40" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
