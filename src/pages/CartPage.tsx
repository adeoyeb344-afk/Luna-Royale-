import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { AppSection, CartItem, DeliveryInfo, User } from '../types';
import { calculateCartSubtotal } from '../services/cartService';
import { formatNaira } from '../services/firestoreService';
import {
  checkPaymentGatewayStatus,
  createOrder,
  initializePaymentTransaction,
  markOrderPaid,
  verifyPaymentTransaction,
} from '../services/orderService';
import { updateUserProfileDetails } from '../services/authService';
import { getUserFriendlyErrorMessage } from '../services/firebase';
import { ProductMedia } from '../components/ProductMedia';

interface ActivePaymentSession {
  orderId: string;
  reference: string;
  authorizationUrl: string;
}

interface CartPageProps {
  items: CartItem[];
  user: User | null;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onNavigate: (section: AppSection) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  items,
  user,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onNavigate,
}) => {
  const [recipientName, setRecipientName] = useState(
    user?.deliveryInfo?.recipientName || user?.fullName || ''
  );
  const [phone, setPhone] = useState(
    user?.deliveryInfo?.phone || user?.phone || ''
  );
  const [streetAddress, setStreetAddress] = useState(
    user?.deliveryInfo?.streetAddress || ''
  );
  const [city, setCity] = useState(user?.deliveryInfo?.city || '');
  const [stateName, setStateName] = useState(user?.deliveryInfo?.state || '');
  const [postalCode, setPostalCode] = useState(
    user?.deliveryInfo?.postalCode || ''
  );
  const [country, setCountry] = useState(
    user?.deliveryInfo?.country || 'Nigeria'
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    user?.deliveryInfo?.deliveryNotes || ''
  );

  const [paystackConfigured, setPaystackConfigured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [activePaymentSession, setActivePaymentSession] = useState<ActivePaymentSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [confirmedPaymentRef, setConfirmedPaymentRef] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<{
    orderId: string;
    subtotal: number;
    deliveryInfo: DeliveryInfo;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setRecipientName(user.deliveryInfo?.recipientName || user.fullName || '');
      setPhone(user.deliveryInfo?.phone || user.phone || '');
      setStreetAddress(user.deliveryInfo?.streetAddress || '');
      setCity(user.deliveryInfo?.city || '');
      setStateName(user.deliveryInfo?.state || '');
      setPostalCode(user.deliveryInfo?.postalCode || '');
      setCountry(user.deliveryInfo?.country || 'Nigeria');
      setDeliveryNotes(user.deliveryInfo?.deliveryNotes || '');
    }
  }, [user]);

  useEffect(() => {
    checkPaymentGatewayStatus().then((status) => {
      setPaystackConfigured(status.configured);
    });
  }, []);

  // Handle Paystack return callback verification (for direct redirect returns)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paystackRef =
      searchParams.get('lr_paystack_ref') ||
      searchParams.get('reference') ||
      searchParams.get('trxref');
    const orderIdFromUrl = searchParams.get('order_id');
    const pendingOrderId =
      orderIdFromUrl ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('lr_pending_order_id')
        : null);

    if (paystackRef) {
      setVerifyingPayment(true);
      setErrorMessage(null);

      verifyPaymentTransaction(paystackRef)
        .then(async (res) => {
          if (res.verified && res.transaction?.status === 'success') {
            const effectiveOrderId =
              pendingOrderId || res.transaction?.orderId || paystackRef;

            if (pendingOrderId) {
              await markOrderPaid(
                pendingOrderId,
                paystackRef,
                res.transaction?.paidAt
              ).catch(() => {});
            }

            // Only clear cart after confirmed successful server verification
            onClearCart();
            setConfirmedOrderId(effectiveOrderId);
            setConfirmedPaymentRef(paystackRef);
            setActivePaymentSession(null);

            try {
              sessionStorage.removeItem('lr_pending_order_id');
            } catch {
              // Ignore storage errors
            }

            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          } else {
            // Never clear cart on failed, cancelled, or unverified transactions
            setErrorMessage(
              res.error ||
                'Payment was not completed or could not be verified with Paystack. Your cart has been preserved.'
            );
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        })
        .catch((err) => {
          setErrorMessage(
            getUserFriendlyErrorMessage(
              err,
              'Unable to verify transaction. Your cart items are preserved.'
            )
          );
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        })
        .finally(() => {
          setVerifyingPayment(false);
        });
    }
  }, []);

  // Background polling for opened Paystack Live checkout window
  useEffect(() => {
    if (!activePaymentSession) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await verifyPaymentTransaction(activePaymentSession.reference);
        if (!isMounted) return;

        if (res.verified && res.transaction?.status === 'success') {
          clearInterval(interval);
          await markOrderPaid(
            activePaymentSession.orderId,
            activePaymentSession.reference,
            res.transaction?.paidAt
          ).catch(() => {});

          onClearCart();
          setConfirmedOrderId(activePaymentSession.orderId);
          setConfirmedPaymentRef(activePaymentSession.reference);
          setActivePaymentSession(null);

          try {
            sessionStorage.removeItem('lr_pending_order_id');
          } catch {
            // Ignore storage errors
          }
        }
      } catch {
        // Silently continue polling
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activePaymentSession]);

  const handleCheckManualPaymentStatus = async () => {
    if (!activePaymentSession) return;
    setIsCheckingStatus(true);
    setErrorMessage(null);

    try {
      const res = await verifyPaymentTransaction(activePaymentSession.reference);
      if (res.verified && res.transaction?.status === 'success') {
        await markOrderPaid(
          activePaymentSession.orderId,
          activePaymentSession.reference,
          res.transaction?.paidAt
        ).catch(() => {});

        onClearCart();
        setConfirmedOrderId(activePaymentSession.orderId);
        setConfirmedPaymentRef(activePaymentSession.reference);
        setActivePaymentSession(null);

        try {
          sessionStorage.removeItem('lr_pending_order_id');
        } catch {
          // Ignore storage errors
        }
      } else {
        setErrorMessage(
          'Payment has not been completed yet. Please complete the payment on Paystack and try verifying again.'
        );
      }
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(
          err,
          'Unable to verify transaction with Paystack. Please try again.'
        )
      );
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const subtotal = calculateCartSubtotal(items);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNavigate('account');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const deliveryInfo: DeliveryInfo = {
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      streetAddress: streetAddress.trim(),
      city: city.trim(),
      state: stateName.trim(),
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || 'Nigeria',
      deliveryNotes: deliveryNotes.trim() || undefined,
    };

    try {
      // Save updated delivery details to the user's profile
      await updateUserProfileDetails(user.uid, {
        fullName: user.fullName || recipientName.trim(),
        phone: user.phone || phone.trim(),
        deliveryInfo,
      }).catch(() => {
        // Non-blocking if profile update has stricter rules
      });

      // 1. Create order in Firestore with pending shipping fee confirmation
      const orderId = await createOrder({
        userId: user.uid,
        customerEmail: user.email,
        customerName: user.fullName || recipientName.trim(),
        items,
        deliveryInfo,
      });

      // 2. Clear customer's shopping cart
      onClearCart();

      // 3. Display the dedicated "Order Received — Awaiting Shipping Confirmation" screen
      setPlacedOrder({
        orderId,
        subtotal,
        deliveryInfo,
      });
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(
          err,
          'Unable to submit order. Please verify your details and try again.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="border border-[#701F36]/25 bg-[#F4F1E8]/70 p-8 sm:p-12 text-center">
          <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
            Order Received
          </p>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl text-[#0B0B0B]">
            Shipping Fee Pending Confirmation
          </h1>
          <p className="mt-2 font-mono text-xs text-[#0B0B0B]/60">
            Order Reference: #{placedOrder.orderId}
          </p>

          <div className="mx-auto mt-6 max-w-md border border-[#0B0B0B]/12 bg-white p-5 text-left text-xs space-y-2.5">
            <div className="flex justify-between border-b border-[#0B0B0B]/8 pb-2">
              <span className="text-[#0B0B0B]/70">Delivery Destination:</span>
              <span className="font-medium text-[#0B0B0B] text-right">
                {placedOrder.deliveryInfo.city}, {placedOrder.deliveryInfo.country}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#0B0B0B]/8 pb-2">
              <span className="text-[#0B0B0B]/70">Products Subtotal:</span>
              <span className="font-medium tabular-nums text-[#0B0B0B]">
                {formatNaira(placedOrder.subtotal)}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#0B0B0B]/8 pb-2">
              <span className="text-[#0B0B0B]/70">Worldwide Shipping:</span>
              <span className="font-medium text-[#701F36] uppercase tracking-wider">
                Pending Confirmation
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-semibold text-[#0B0B0B]">Total Payable:</span>
              <span className="text-[#0B0B0B]/60 italic">
                Calculated after confirmation
              </span>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-[#0B0B0B]/75">
            Thank you for ordering with LUNA ROYALE. Because we provide worldwide white-glove shipping, our atelier team will review your destination and determine the exact courier fee. Once confirmed, you can review the final total and complete payment with Paystack in your Orders section.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors"
            >
              View in My Orders
            </button>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="border border-[#0B0B0B]/25 px-6 py-3 text-xs font-medium tracking-wider text-[#0B0B0B] uppercase hover:border-[#701F36] hover:text-[#701F36] transition-colors"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePaymentSession) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="border border-[#701F36]/25 bg-[#F4F1E8]/70 p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#701F36]/30 text-[#701F36]">
            <ExternalLink className="h-6 w-6" />
          </div>
          <p className="mt-4 text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
            Paystack Live Checkout
          </p>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl text-[#0B0B0B]">
            Complete Your Payment
          </h1>
          <p className="mt-2 font-mono text-xs text-[#0B0B0B]/60">
            Order Reference: #{activePaymentSession.orderId}
          </p>
          <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-[#0B0B0B]/75">
            A secure Paystack Live checkout window has been prepared. If your browser blocked the window from opening automatically, click below to complete your payment on Paystack.
          </p>

          {errorMessage && (
            <div className="mx-auto mt-5 max-w-md border border-red-200 bg-red-50/90 px-4 py-3 text-left text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          <div className="mt-7 flex flex-col items-center justify-center gap-3">
            <a
              href={activePaymentSession.authorizationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#701F36] px-8 py-3.5 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors"
            >
              <span>Proceed to Paystack Payment</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              disabled={isCheckingStatus}
              onClick={handleCheckManualPaymentStatus}
              className="inline-flex items-center gap-2 border border-[#0B0B0B]/20 bg-white px-6 py-2.5 text-xs font-medium text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors disabled:opacity-50"
            >
              {isCheckingStatus ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#701F36]" />
                  <span>Verifying Payment...</span>
                </>
              ) : (
                <span>I Have Completed Payment</span>
              )}
            </button>
          </div>

          <div className="mt-8 border-t border-[#0B0B0B]/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#0B0B0B]/65">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-[#701F36]" />
              Awaiting payment confirmation...
            </span>
            <button
              type="button"
              onClick={() => {
                setActivePaymentSession(null);
                setErrorMessage(null);
              }}
              className="text-xs text-[#0B0B0B]/60 hover:text-[#701F36] underline cursor-pointer"
            >
              Return to Bag
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (verifyingPayment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-8 sm:p-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#701F36]" />
          <p className="mt-4 text-xs tracking-[0.2em] text-[#701F36] uppercase">
            Payment Verification
          </p>
          <h1 className="mt-2 font-display text-2xl text-[#0B0B0B]">
            Verifying Transaction with Paystack
          </h1>
          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[#0B0B0B]/70">
            Please wait while we confirm your payment status directly with the gateway. Do not refresh or close this window.
          </p>
        </div>
      </div>
    );
  }

  if (confirmedOrderId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-8 sm:p-12 text-center">
          <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
            Order Confirmed
          </p>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl text-[#0B0B0B]">
            Thank You for Your Order
          </h1>
          <p className="mt-2 font-mono text-xs text-[#0B0B0B]/65">
            Order Reference: #{confirmedOrderId}
          </p>
          {confirmedPaymentRef && (
            <p className="mt-1 font-mono text-xs text-[#0B0B0B]/50">
              Payment Reference: {confirmedPaymentRef}
            </p>
          )}
          <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-[#0B0B0B]/75">
            Your order and payment have been securely recorded in your LUNA ROYALE account. You can view its real-time fulfillment status at any time in My Orders.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors"
            >
              View My Orders
            </button>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="border border-[#0B0B0B]/25 px-6 py-3 text-xs font-medium tracking-wider text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="border-b border-[#0B0B0B]/12 pb-8">
        <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
          LUNA ROYALE Bag
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-normal tracking-wide text-[#0B0B0B]">
          Shopping Cart
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-[#0B0B0B]/15 text-[#701F36]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg text-[#0B0B0B]">
            Your cart is empty
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#0B0B0B]/65">
            Discover curated pieces across Jewelry, Watches, Eyewear, Fragrance, Royale Home, and Gift Sets.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="mt-6 bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors whitespace-nowrap"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Cart Items List */}
          <div className="lg:col-span-7 divide-y divide-[#0B0B0B]/10 border-t border-b border-[#0B0B0B]/10">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-5 py-6">
                <div className="h-28 w-24 shrink-0">
                  <ProductMedia
                    src={item.image}
                    alt={item.name}
                    categoryLabel={item.categoryLabel}
                    aspectClassName="h-28 w-24"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#0B0B0B]/60">
                        {item.categoryLabel}
                      </p>
                      <h3 className="mt-1 font-display text-base font-medium text-[#0B0B0B]">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs tabular-nums text-[#0B0B0B]/70">
                        Unit Price: {formatNaira(item.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId)}
                      aria-label={`Remove ${item.name}`}
                      className="text-[#0B0B0B]/45 hover:text-[#701F36] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#0B0B0B]/20 bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(item.productId, item.quantity - 1)
                        }
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center text-[#0B0B0B] hover:bg-[#0B0B0B]/5"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-3 text-xs font-medium tabular-nums text-[#0B0B0B]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(item.productId, item.quantity + 1)
                        }
                        aria-label={`Increase quantity of ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center text-[#0B0B0B] hover:bg-[#0B0B0B]/5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <span className="font-display text-base font-semibold tabular-nums text-[#0B0B0B]">
                      {formatNaira(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary & Delivery Confirmation (No invented shipping or tax amounts) */}
          <div className="lg:col-span-5">
            <div className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6 sm:p-8">
              <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
                Order Summary
              </h2>

              <div className="mt-6 space-y-3 border-b border-[#0B0B0B]/12 pb-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#0B0B0B]/70">Subtotal</span>
                  <span className="font-display text-lg font-semibold tabular-nums text-[#0B0B0B]">
                    {formatNaira(subtotal)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#0B0B0B]/55">
                  Prices are displayed in Nigerian Naira (₦). No unverified shipping fees, taxes, or payment surcharges are added.
                </p>
              </div>

              {!user ? (
                <div className="mt-6">
                  <p className="text-xs leading-relaxed text-[#0B0B0B]/75">
                    Please sign in to your LUNA ROYALE account to save your delivery information and complete your order.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('account')}
                    className="mt-4 w-full bg-[#701F36] py-3.5 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors"
                  >
                    Sign In to Checkout
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="mt-6 space-y-4">
                  <h3 className="font-display text-sm tracking-wider text-[#0B0B0B]">
                    Delivery Information
                  </h3>

                  {errorMessage && (
                    <div className="border border-[#701F36]/40 bg-[#701F36]/5 p-3 text-xs text-[#701F36]">
                      {errorMessage}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="checkout-recipient"
                      className="block text-xs font-medium text-[#0B0B0B]/80"
                    >
                      Recipient Full Name
                    </label>
                    <input
                      id="checkout-recipient"
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-phone"
                      className="block text-xs font-medium text-[#0B0B0B]/80"
                    >
                      Phone Number
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-street"
                      className="block text-xs font-medium text-[#0B0B0B]/80"
                    >
                      Street Address
                    </label>
                    <input
                      id="checkout-street"
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="checkout-city"
                        className="block text-xs font-medium text-[#0B0B0B]/80"
                      >
                        City
                      </label>
                      <input
                        id="checkout-city"
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-state"
                        className="block text-xs font-medium text-[#0B0B0B]/80"
                      >
                        State / Region
                      </label>
                      <input
                        id="checkout-state"
                        type="text"
                        required
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-postal"
                        className="block text-xs font-medium text-[#0B0B0B]/80"
                      >
                        Postal / ZIP (Optional)
                      </label>
                      <input
                        id="checkout-postal"
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="e.g. 100001"
                        className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-country"
                      className="block text-xs font-medium text-[#0B0B0B]/80"
                    >
                      Country (Worldwide Shipping)
                    </label>
                    <input
                      id="checkout-country"
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Nigeria, United Kingdom, United States, UAE, etc."
                      className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-notes"
                      className="block text-xs font-medium text-[#0B0B0B]/80"
                    >
                      Delivery Notes (Optional)
                    </label>
                    <input
                      id="checkout-notes"
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#701F36] py-3.5 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
                    >
                      {submitting
                        ? 'Submitting Order...'
                        : 'Place Order & Request Shipping Quote'}
                    </button>
                    <p className="mt-2 text-center text-[11px] text-[#0B0B0B]/60">
                      Worldwide courier shipping fee will be reviewed and confirmed by our atelier before payment is unlocked.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
