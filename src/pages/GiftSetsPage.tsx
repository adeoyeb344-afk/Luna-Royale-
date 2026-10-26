import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Box, CartItem, Product } from '../types';
import { isBoxPubliclyAvailable } from '../services/productService';
import { formatNaira, getCustomerCategoryLabel } from '../services/firestoreService';
import { ProductMedia } from '../components/ProductMedia';

interface GiftSetsPageProps {
  boxes: Box[];
  products: Product[];
  onAddBoxToCart: (item: CartItem) => void;
  onSelectProduct: (productId: string) => void;
}

export const GiftSetsPage: React.FC<GiftSetsPageProps> = ({
  boxes,
  products,
  onAddBoxToCart,
  onSelectProduct,
}) => {
  const publishedProducts = products.filter((p) => p.published);

  // Only display a box/set as publicly purchasable when real products and a real price have been configured by an administrator
  const configuredBoxes = boxes.filter((box) =>
    isBoxPubliclyAvailable(box, publishedProducts)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="border-b border-[#0B0B0B]/12 pb-8">
        <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
          Boxes & Sets
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-normal tracking-wide text-[#0B0B0B]">
          Gift Sets
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#0B0B0B]/70">
          Thoughtfully composed LUNA ROYALE gift boxes pairing fine jewelry, timepieces, signature fragrance, and Royale Home scents.
        </p>
      </div>

      {/* Configured & Publicly Available Boxes */}
      {configuredBoxes.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
          {configuredBoxes.map((box) => {
            const boxProducts = publishedProducts.filter(
              (p) => box.productIds.includes(p.id) || p.boxIds.includes(box.id)
            );
            const coverImage =
              box.images[0] || boxProducts[0]?.images[0] || null;

            return (
              <article
                key={box.id}
                className="flex flex-col justify-between border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6 sm:p-8"
              >
                <div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <ProductMedia
                        src={coverImage}
                        alt={box.name}
                        categoryLabel="Gift Set"
                        aspectClassName="aspect-[3/4]"
                      />
                    </div>
                    <div className="sm:col-span-7 flex flex-col justify-between">
                      <div>
                        <p className="text-xs tracking-wider text-[#701F36] uppercase">
                          {box.composition}
                        </p>
                        <h2 className="mt-1.5 font-display text-xl font-medium tracking-wider text-[#0B0B0B]">
                          {box.name}
                        </h2>
                        <p className="mt-3 text-xs leading-relaxed text-[#0B0B0B]/75">
                          {box.description}
                        </p>

                        <div className="mt-5 border-t border-[#0B0B0B]/10 pt-4">
                          <p className="text-[11px] font-medium tracking-wider text-[#0B0B0B]/60 uppercase">
                            Included Pieces ({boxProducts.length})
                          </p>
                          <ul className="mt-2 space-y-1.5 text-xs text-[#0B0B0B]/80">
                            {boxProducts.map((bp) => (
                              <li key={bp.id} className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => onSelectProduct(bp.id)}
                                  className="hover:text-[#701F36] underline decoration-[#0B0B0B]/20 underline-offset-4"
                                >
                                  {bp.name}
                                </button>
                                <span className="text-[#0B0B0B]/50">
                                  {getCustomerCategoryLabel(bp.category)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-[#0B0B0B]/12 pt-4">
                        <span className="font-display text-lg font-semibold tabular-nums text-[#0B0B0B]">
                          {formatNaira(box.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof box.price === 'number' && box.price > 0) {
                              onAddBoxToCart({
                                productId: `box:${box.id}`,
                                itemType: 'box',
                                name: box.name,
                                categoryLabel: `Gift Set · ${box.composition}`,
                                price: box.price,
                                currency: 'NGN',
                                quantity: 1,
                                image: coverImage,
                              });
                            }
                          }}
                          className="inline-flex items-center gap-2 bg-[#701F36] px-5 py-2.5 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors whitespace-nowrap"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Add Set to Cart</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-10 border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-14 text-center">
          <p className="font-display text-lg text-[#0B0B0B]">
            No products available yet.
          </p>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-[#0B0B0B]/65">
            Gift Sets are displayed for acquisition once real products and official pricing have been configured by an administrator.
          </p>
        </div>
      )}

      {/* Official Merchandising Set Structure Directory */}
      <div className="mt-16">
        <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
          Official Boxes & Sets Architecture
        </h2>
        <p className="mt-1 text-xs text-[#0B0B0B]/60">
          Each LUNA ROYALE signature box is structured around a distinct pairing of house creations.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {boxes.map((box, idx) => {
            const isReady = isBoxPubliclyAvailable(box, publishedProducts);
            return (
              <div
                key={box.id}
                className="flex flex-col justify-between border border-[#0B0B0B]/12 bg-[#F8F6EF] p-5"
              >
                <div>
                  <span className="font-mono text-xs tabular-nums text-[#701F36]">
                    0{idx + 1}
                  </span>
                  <h3 className="mt-3 font-display text-sm font-semibold tracking-wider text-[#0B0B0B]">
                    {box.name}
                  </h3>
                  <p className="mt-1.5 text-xs font-medium text-[#701F36]">
                    {box.composition}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#0B0B0B]/60">
                    {box.description}
                  </p>
                </div>

                <div className="mt-5 border-t border-[#0B0B0B]/10 pt-3 text-[11px] text-[#0B0B0B]/55">
                  {isReady && box.price ? (
                    <span className="font-medium tabular-nums text-[#0B0B0B]">
                      Available · {formatNaira(box.price)}
                    </span>
                  ) : (
                    <span>Awaiting administrator curation</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
