import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { AppSection, CartItem } from '../types';
import { calculateCartSubtotal } from '../services/cartService';
import { formatNaira } from '../services/firestoreService';
import { ProductMedia } from './ProductMedia';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onNavigate: (section: AppSection) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const subtotal = calculateCartSubtotal(items);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0B0B0B]/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
    >
      <div className="flex h-full w-full max-w-md flex-col justify-between bg-[#F8F6EF] border-l border-[#0B0B0B]/15 p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-[#0B0B0B]/10 pb-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-[#701F36]" />
            <h2 className="font-display text-base tracking-wider text-[#0B0B0B]">
              Shopping Cart
            </h2>
            <span className="text-xs tabular-nums text-[#0B0B0B]/60">
              ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart drawer"
            className="flex h-10 w-10 items-center justify-center text-[#0B0B0B]/70 hover:text-[#701F36] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center border border-[#0B0B0B]/15 text-[#701F36]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <p className="font-display text-lg text-[#0B0B0B]">
              Your cart is empty
            </p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#0B0B0B]/60">
              Explore our curated jewelry, timepieces, eyewear, signature fragrances, and gift sets.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('shop');
              }}
              className="mt-6 bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors whitespace-nowrap"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-[#0B0B0B]/10 overflow-y-auto py-4">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-4 py-4">
                  <div className="h-24 w-20 shrink-0">
                    <ProductMedia
                      src={item.image}
                      alt={item.name}
                      categoryLabel={item.categoryLabel}
                      aspectClassName="h-24 w-20"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-medium text-[#0B0B0B]">
                          {item.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.productId)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="text-[#0B0B0B]/40 hover:text-[#701F36] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-[#0B0B0B]/55">
                        {item.categoryLabel}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#0B0B0B]/20 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, item.quantity - 1)
                          }
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center text-[#0B0B0B] hover:bg-[#0B0B0B]/5"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 text-xs font-medium tabular-nums text-[#0B0B0B]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.productId, item.quantity + 1)
                          }
                          aria-label={`Increase quantity of ${item.name}`}
                          className="flex h-7 w-7 items-center justify-center text-[#0B0B0B] hover:bg-[#0B0B0B]/5"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-sm font-medium tabular-nums text-[#0B0B0B]">
                        {formatNaira(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#0B0B0B]/15 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider text-[#0B0B0B]/70 uppercase">
                  Subtotal
                </span>
                <span className="font-display text-lg font-semibold tabular-nums text-[#0B0B0B]">
                  {formatNaira(subtotal)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('cart');
                  }}
                  className="w-full bg-[#701F36] py-3.5 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors whitespace-nowrap"
                >
                  View Cart & Checkout
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full border border-[#0B0B0B]/20 py-3 text-xs font-medium tracking-wider text-[#0B0B0B] hover:border-[#0B0B0B] transition-colors whitespace-nowrap"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
