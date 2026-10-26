import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Star,
} from 'lucide-react';
import { Order, Product, Review, User } from '../types';
import {
  formatDisplayDate,
  formatNaira,
  getAvailabilityLabel,
  getCustomerCategoryLabel,
} from '../services/firestoreService';
import {
  findVerifiedOrderForProduct,
  subscribeToProductReviews,
  submitVerifiedReview,
} from '../services/reviewService';
import { getUserFriendlyErrorMessage } from '../services/firebase';
import { ProductMedia } from '../components/ProductMedia';

interface ProductDetailPageProps {
  product: Product | null;
  user: User | null;
  userOrders: Order[];
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  onAddToCartWithQuantity: (product: Product, quantity: number) => void;
  onBack: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  user,
  userOrders,
  isWishlisted,
  onToggleWishlist,
  onAddToCartWithQuantity,
  onBack,
}) => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  useEffect(() => {
    setSelectedImageIdx(0);
    setQuantity(1);
    setReviewError(null);
    setReviewSuccess(null);

    if (!product) {
      setReviews([]);
      return;
    }

    const unsubscribe = subscribeToProductReviews(product.id, (loaded) => {
      setReviews(loaded);
    });
    return () => unsubscribe();
  }, [product]);

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="font-display text-lg text-[#0B0B0B]">
          No products available yet.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-2 border border-[#0B0B0B]/25 px-6 py-2.5 text-xs font-medium tracking-wider text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Catalog</span>
        </button>
      </div>
    );
  }

  const categoryLabel = getCustomerCategoryLabel(product.category);
  const availabilityLabel = getAvailabilityLabel(product.availability);
  const isOutOfStock = product.availability === 'out_of_stock';
  const activeImage = product.images[selectedImageIdx] || product.images[0] || null;
  const verifiedOrder = user
    ? findVerifiedOrderForProduct(userOrders, product.id)
    : undefined;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !verifiedOrder) return;
    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      await submitVerifiedReview({
        productId: product.id,
        orderId: verifiedOrder.id,
        userId: user.uid,
        authorName: user.fullName || user.email || 'Verified Client',
        rating,
        comment,
      });
      setComment('');
      setRating(5);
      setReviewSuccess('Your verified purchase review has been submitted.');
    } catch (err) {
      setReviewError(
        getUserFriendlyErrorMessage(err, 'Unable to submit review at this time.')
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium tracking-wider text-[#0B0B0B]/70 hover:text-[#701F36] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Catalog</span>
      </button>

      {/* Contiguous Purchase Module (Gallery Left, Purchase Details Right) */}
      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Left Column: Product Image Gallery */}
        <div className="lg:col-span-6">
          <ProductMedia
            src={activeImage}
            alt={product.name}
            categoryLabel={categoryLabel}
            aspectClassName="aspect-[3/4]"
          />

          {product.images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {product.images.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  aria-label={`View image ${idx + 1} of ${product.name}`}
                  className={`overflow-hidden border transition-colors ${
                    selectedImageIdx === idx
                      ? 'border-[#701F36]'
                      : 'border-[#0B0B0B]/12 opacity-75 hover:opacity-100'
                  }`}
                >
                  <ProductMedia
                    src={imgUrl}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    aspectClassName="aspect-square"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Purchase Details */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#0B0B0B]/65">
              <span>{categoryLabel}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  isOutOfStock ? 'text-[#701F36] font-medium' : 'text-[#0B0B0B]/70'
                }
              >
                {availabilityLabel}
              </span>
            </div>

            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-normal tracking-wide text-[#0B0B0B]">
              {product.name}
            </h1>

            <p className="mt-4 font-display text-2xl font-medium tabular-nums text-[#701F36]">
              {formatNaira(product.price)}
            </p>

            {product.description && (
              <div className="mt-8 border-t border-[#0B0B0B]/10 pt-6">
                <h2 className="text-xs font-medium tracking-wider text-[#0B0B0B]/60 uppercase">
                  Description
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#0B0B0B]/80 whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity & Actions */}
            <div className="mt-8 border-t border-[#0B0B0B]/10 pt-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider text-[#0B0B0B]/70 uppercase">
                  Quantity
                </span>
                <div className="inline-flex items-center border border-[#0B0B0B]/20 bg-white">
                  <button
                    type="button"
                    disabled={isOutOfStock || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="flex h-10 w-10 items-center justify-center text-[#0B0B0B] hover:bg-[#0B0B0B]/5 disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-12 text-center text-sm font-medium tabular-nums text-[#0B0B0B]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isOutOfStock || quantity >= 99}
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    aria-label="Increase quantity"
                    className="flex h-10 w-10 items-center justify-center text-[#0B0B0B] hover:bg-[#0B0B0B]/5 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => onAddToCartWithQuantity(product, quantity)}
                  className={`flex flex-1 items-center justify-center gap-2.5 py-4 px-6 text-xs font-medium tracking-[0.16em] uppercase transition-colors whitespace-nowrap ${
                    isOutOfStock
                      ? 'cursor-not-allowed bg-[#0B0B0B]/15 text-[#0B0B0B]/45'
                      : 'bg-[#701F36] text-[#F8F6EF] hover:bg-[#0B0B0B]'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  className="inline-flex items-center justify-center gap-2 border border-[#0B0B0B]/25 bg-transparent px-6 py-4 text-xs font-medium tracking-wider text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors whitespace-nowrap"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isWishlisted ? 'fill-[#701F36] text-[#701F36]' : ''
                    }`}
                  />
                  <span>{isWishlisted ? 'In Wishlist' : 'Wishlist'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-[#0B0B0B]/10 pt-5 text-xs text-[#0B0B0B]/55">
            <span>Official Category: {product.category}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Currency: NGN (₦)</span>
          </div>
        </div>
      </div>

      {/* Verified Purchase Reviews Section */}
      <section className="mt-20 border-t border-[#0B0B0B]/12 pt-14">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#701F36] uppercase">
              Client Impressions
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-normal tracking-wide text-[#0B0B0B]">
              Verified Reviews
            </h2>
          </div>
          {reviews.length > 0 && (
            <p className="text-xs tabular-nums text-[#0B0B0B]/65">
              {reviews.length} {reviews.length === 1 ? 'verified review' : 'verified reviews'}
            </p>
          )}
        </div>

        <div className="mt-8">
          {reviews.length === 0 ? (
            <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-12 text-center">
              <p className="font-display text-sm sm:text-base text-[#0B0B0B]">
                Customer reviews will appear here once verified purchases are reviewed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#0B0B0B]/10 border-t border-b border-[#0B0B0B]/10">
              {reviews.map((rev) => (
                <article key={rev.id} className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-[#0B0B0B]">
                        {rev.authorName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#701F36]">Verified Purchase</span>
                    </div>
                    {rev.createdAt && (
                      <span className="text-xs text-[#0B0B0B]/50">
                        {formatDisplayDate(rev.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-[#D6B47A]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < rev.rating
                            ? 'fill-[#D6B47A] text-[#D6B47A]'
                            : 'text-[#0B0B0B]/20'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[#0B0B0B]/80">
                    {rev.comment}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Verified Buyer Review Submission Form */}
        {verifiedOrder && (
          <form
            onSubmit={handleReviewSubmit}
            className="mt-10 border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6 sm:p-8"
          >
            <h3 className="font-display text-base text-[#0B0B0B]">
              Submit a Verified Purchase Review
            </h3>
            <p className="mt-1 text-xs text-[#0B0B0B]/60">
              Verified against Order #{verifiedOrder.id.slice(0, 8)}
            </p>

            {reviewError && (
              <p className="mt-4 text-xs text-[#701F36]">{reviewError}</p>
            )}
            {reviewSuccess && (
              <p className="mt-4 text-xs text-[#0B0B0B] font-medium">
                {reviewSuccess}
              </p>
            )}

            <div className="mt-5">
              <label className="block text-xs font-medium text-[#0B0B0B]/80">
                Rating
              </label>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                      rating === num
                        ? 'border-[#701F36] bg-[#701F36] text-[#F8F6EF]'
                        : 'border-[#0B0B0B]/20 bg-white text-[#0B0B0B]'
                    }`}
                  >
                    {num} ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="review-comment"
                className="block text-xs font-medium text-[#0B0B0B]/80"
              >
                Your Review
              </label>
              <textarea
                id="review-comment"
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this piece..."
                className="mt-2 w-full border border-[#0B0B0B]/20 bg-white p-3 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="mt-5 bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
            >
              {submittingReview ? 'Submitting...' : 'Publish Verified Review'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};
