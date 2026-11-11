import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Globe,
  HelpCircle,
  Info,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
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
import {
  getAllDeliveryRates,
  lookupDeliveryOptions,
} from '../services/deliveryService';
import { DeliveryRate } from '../data/defaultDeliveryRates';

interface ActivePaymentSession {
  orderId: string;
  reference: string;
  authorizationUrl: string;
}

interface ConfirmedOrderSummary {
  orderId: string;
  paymentReference?: string;
  subtotal: number;
  deliveryFee: number;
  destination: string;
  courier: string;
  totalPaid: number;
  paymentMethod: 'paystack' | 'courier_on_arrival';
  recipientName: string;
  deliveryAddress: string;
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
  // Delivery Form Fields
  const [recipientName, setRecipientName] = useState(
    user?.deliveryInfo?.recipientName || user?.fullName || ''
  );
  const [phone, setPhone] = useState(
    user?.deliveryInfo?.phone || user?.phone || ''
  );
  const [streetAddress, setStreetAddress] = useState(
    user?.deliveryInfo?.streetAddress || ''
  );
  const [country, setCountry] = useState(
    user?.deliveryInfo?.country || 'Nigeria'
  );
  const [stateName, setStateName] = useState(
    user?.deliveryInfo?.state || 'Lagos'
  );
  const [cityOrArea, setCityOrArea] = useState(
    user?.deliveryInfo?.destinationArea || user?.deliveryInfo?.city || 'Ikeja'
  );
  const [postalCode, setPostalCode] = useState(
    user?.deliveryInfo?.postalCode || ''
  );
  const [deliveryNotes, setDeliveryNotes] = useState(
    user?.deliveryInfo?.deliveryNotes || ''
  );

  // Delivery Pricing & Courier Selection State
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRate[]>(() =>
    getAllDeliveryRates()
  );
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<
    'paystack' | 'courier_on_arrival'
  >('paystack');

  // Checkout & Gateway States
  const [paystackConfigured, setPaystackConfigured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [activePaymentSession, setActivePaymentSession] =
    useState<ActivePaymentSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [confirmedPaymentRef, setConfirmedPaymentRef] = useState<string | null>(
    null
  );
  const [confirmedSummary, setConfirmedSummary] =
    useState<ConfirmedOrderSummary | null>(null);

  // Sync delivery rates dynamically if updated in admin dashboard
  useEffect(() => {
    const handleRatesUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DeliveryRate[]>;
      if (customEvent.detail) {
        setDeliveryRates(customEvent.detail);
      } else {
        setDeliveryRates(getAllDeliveryRates());
      }
    };
    window.addEventListener('lr_delivery_rates_updated', handleRatesUpdate);
    return () => {
      window.removeEventListener('lr_delivery_rates_updated', handleRatesUpdate);
    };
  }, []);

  // Pre-fill user profile if available
  useEffect(() => {
    if (user) {
      if (!recipientName) {
        setRecipientName(user.deliveryInfo?.recipientName || user.fullName || '');
      }
      if (!phone) {
        setPhone(user.deliveryInfo?.phone || user.phone || '');
      }
      if (!streetAddress && user.deliveryInfo?.streetAddress) {
        setStreetAddress(user.deliveryInfo.streetAddress);
      }
      if (user.deliveryInfo?.country) {
        setCountry(user.deliveryInfo.country);
      }
      if (user.deliveryInfo?.state) {
        setStateName(user.deliveryInfo.state);
      }
      if (user.deliveryInfo?.destinationArea || user.deliveryInfo?.city) {
        setCityOrArea(
          user.deliveryInfo.destinationArea || user.deliveryInfo.city || ''
        );
      }
      if (!postalCode && user.deliveryInfo?.postalCode) {
        setPostalCode(user.deliveryInfo.postalCode);
      }
      if (!deliveryNotes && user.deliveryInfo?.deliveryNotes) {
        setDeliveryNotes(user.deliveryInfo.deliveryNotes);
      }
    }
  }, [user]);

  useEffect(() => {
    checkPaymentGatewayStatus().then((status) => {
      setPaystackConfigured(status.configured);
    });
  }, []);

  // Compute lookup results dynamically based on country, state, city/destination
  const lookupResult = useMemo(() => {
    return lookupDeliveryOptions({
      country,
      state: stateName,
      cityOrArea,
      rates: deliveryRates,
    });
  }, [country, stateName, cityOrArea, deliveryRates]);

  // Keep selectedRate in sync with lookup options
  const selectedRate = useMemo(() => {
    if (!lookupResult.options || lookupResult.options.length === 0) return null;
    const match = lookupResult.options.find((r) => r.id === selectedRateId);
    return match || lookupResult.options[0];
  }, [lookupResult.options, selectedRateId]);

  // Auto-select first available courier route when options change
  useEffect(() => {
    if (lookupResult.options && lookupResult.options.length > 0) {
      const exists = lookupResult.options.some((r) => r.id === selectedRateId);
      if (!exists) {
        setSelectedRateId(lookupResult.options[0].id);
      }
    }
  }, [lookupResult.options, selectedRateId]);

  // If selected route doesn't allow payOnArrival, revert to paystack
  useEffect(() => {
    if (selectedRate && !selectedRate.payOnArrivalAllowed && deliveryPaymentMethod === 'courier_on_arrival') {
      setDeliveryPaymentMethod('paystack');
    }
  }, [selectedRate, deliveryPaymentMethod]);

  // Handle Paystack return callback verification (redirect flow)
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
  }, [onClearCart]);

  // Background polling for opened Paystack Live checkout session
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
  }, [activePaymentSession, onClearCart]);

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

  // Calculations
  const subtotal = calculateCartSubtotal(items);
  const deliveryFee =
    selectedRate && typeof selectedRate.price === 'number'
      ? selectedRate.price
      : 0;
  const isQuoteRequired = lookupResult.quoteRequired;
  const isUnavailable = lookupResult.isUnavailable;

  // Final Paystack amount (online payment)
  const isPayOnArrival =
    deliveryPaymentMethod === 'courier_on_arrival' &&
    selectedRate?.payOnArrivalAllowed;
  const paystackAmount = isPayOnArrival ? subtotal : subtotal + deliveryFee;
  const totalPayable = subtotal + deliveryFee;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNavigate('account');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your bag is currently empty.');
      return;
    }

    if (isQuoteRequired) {
      setErrorMessage(
        'International delivery fee requires a logistics quote. Please contact customer support to receive an official logistics quote.'
      );
      return;
    }

    if (isUnavailable || !selectedRate || selectedRate.price === null) {
      setErrorMessage(
        'Delivery fee currently unavailable for this location. Please contact customer support.'
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const deliveryInfo: DeliveryInfo = {
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      streetAddress: streetAddress.trim(),
      city: cityOrArea.trim(),
      state: stateName.trim(),
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || 'Nigeria',
      destinationArea: selectedRate.destination,
      courierName: selectedRate.courier,
      deliveryPaymentMethod: isPayOnArrival ? 'courier_on_arrival' : 'paystack',
      deliveryNotes: deliveryNotes.trim() || undefined,
    };

    try {
      // 1. Update user profile delivery details (non-blocking)
      await updateUserProfileDetails(user.uid, {
        fullName: user.fullName || recipientName.trim(),
        phone: user.phone || phone.trim(),
        deliveryInfo,
      }).catch(() => {});

      // 2. Create order in Firestore with automatically confirmed delivery fee and courier details
      const orderId = await createOrder({
        userId: user.uid,
        customerEmail: user.email,
        customerName: user.fullName || recipientName.trim(),
        items,
        deliveryInfo,
        shippingFee: deliveryFee,
        selectedDestination: selectedRate.destination,
        selectedCourier: selectedRate.courier,
        deliveryPaymentMethod: isPayOnArrival ? 'courier_on_arrival' : 'paystack',
        shippingStatus: 'confirmed',
      });

      try {
        sessionStorage.setItem('lr_pending_order_id', orderId);
      } catch {
        // Ignore storage errors
      }

      // Save summary details for order confirmation display
      setConfirmedSummary({
        orderId,
        subtotal,
        deliveryFee,
        destination: selectedRate.destination,
        courier: selectedRate.courier,
        totalPaid: paystackAmount,
        paymentMethod: isPayOnArrival ? 'courier_on_arrival' : 'paystack',
        recipientName: recipientName.trim(),
        deliveryAddress: `${streetAddress.trim()}, ${cityOrArea.trim()}, ${stateName.trim()}`,
      });

      // 3. Initialize Paystack Transaction directly with product subtotal + delivery fee
      const callbackUrl = `${window.location.origin}/cart?order_id=${encodeURIComponent(orderId)}`;
      const tx = await initializePaymentTransaction({
        email: user.email,
        amountNaira: paystackAmount,
        orderId,
        items,
        callbackUrl,
      });

      // 4. Set active payment session for in-place verification & polling
      setActivePaymentSession({
        orderId,
        reference: tx.reference,
        authorizationUrl: tx.authorization_url,
      });

      // Open Paystack Live checkout popup/window
      const win = window.open(tx.authorization_url, '_blank');
      if (!win) {
        // Popup was blocked by browser; user will click the explicit button
      }
    } catch (err) {
      setErrorMessage(
        getUserFriendlyErrorMessage(
          err,
          'Unable to initialize checkout with Paystack. Please try again.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Active Payment Session Screen (Paystack Window / Verification)
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

          {/* Breakdown summary preview during payment */}
          <div className="mx-auto mt-6 max-w-md border border-[#0B0B0B]/12 bg-white p-4 text-left text-xs space-y-2">
            <div className="flex justify-between text-[#0B0B0B]/70">
              <span>Products Subtotal:</span>
              <span className="font-medium text-[#0B0B0B]">{formatNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#0B0B0B]/70">
              <span>Delivery Fee ({selectedRate?.courier || 'Courier'}):</span>
              <span className="font-medium text-[#701F36]">
                {formatNaira(deliveryFee)}
              </span>
            </div>
            {isPayOnArrival && (
              <p className="text-[11px] text-amber-800 italic">
                * Delivery fee of {formatNaira(deliveryFee)} will be collected by courier upon arrival.
              </p>
            )}
            <div className="flex justify-between border-t border-[#0B0B0B]/10 pt-2 font-semibold text-[#0B0B0B]">
              <span>Paystack Amount:</span>
              <span className="font-display text-sm text-[#701F36]">
                {formatNaira(paystackAmount)}
              </span>
            </div>
          </div>

          <p className="mx-auto mt-5 max-w-md text-xs leading-relaxed text-[#0B0B0B]/75">
            A secure Paystack Live checkout window has opened. Complete your card, bank transfer, or USSD payment, and this page will automatically confirm your order.
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
              Awaiting payment verification...
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

  // 2. Verifying Payment Loading Screen
  if (verifyingPayment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-8 sm:p-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#701F36]" />
          <p className="mt-4 text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
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

  // 3. Confirmed Order Screen (Full breakdown & confirmation)
  if (confirmedOrderId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="border border-[#701F36]/25 bg-[#F4F1E8]/70 p-8 sm:p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mt-4 text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
            Order Confirmed & Paid
          </p>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl text-[#0B0B0B]">
            Thank You for Your Order
          </h1>
          <p className="mt-2 font-mono text-xs text-[#0B0B0B]/65">
            Order Reference: #{confirmedOrderId}
          </p>
          {confirmedPaymentRef && (
            <p className="mt-1 font-mono text-xs text-[#0B0B0B]/50">
              Paystack Reference: {confirmedPaymentRef}
            </p>
          )}

          {/* Full separate breakdown */}
          <div className="mx-auto mt-8 max-w-md border border-[#0B0B0B]/12 bg-white p-5 text-left text-xs space-y-3">
            <h3 className="font-display text-xs tracking-wider uppercase text-[#701F36] border-b border-[#0B0B0B]/10 pb-2">
              Payment & Dispatch Summary
            </h3>
            {confirmedSummary?.destination && (
              <div className="flex justify-between border-b border-[#0B0B0B]/8 pb-2">
                <span className="text-[#0B0B0B]/70">Delivery Destination:</span>
                <span className="font-medium text-[#0B0B0B] text-right">
                  {confirmedSummary.destination}
                </span>
              </div>
            )}
            {confirmedSummary?.courier && (
              <div className="flex justify-between border-b border-[#0B0B0B]/8 pb-2">
                <span className="text-[#0B0B0B]/70">Selected Courier Route:</span>
                <span className="font-medium text-[#0B0B0B] text-right">
                  {confirmedSummary.courier}
                </span>
              </div>
            )}
            {confirmedSummary?.subtotal !== undefined && (
              <div className="flex justify-between border-b border-[#0B0B0B]/8 pb-2">
                <span className="text-[#0B0B0B]/70">Product Subtotal:</span>
                <span className="font-medium tabular-nums text-[#0B0B0B]">
                  {formatNaira(confirmedSummary.subtotal)}
                </span>
              </div>
            )}
            {confirmedSummary?.deliveryFee !== undefined && (
              <div className="flex justify-between border-b border-[#0B0B0B]/8 pb-2">
                <span className="text-[#0B0B0B]/70">Delivery Fee:</span>
                <span className="font-medium tabular-nums text-[#701F36]">
                  {formatNaira(confirmedSummary.deliveryFee)}
                  {confirmedSummary.paymentMethod === 'courier_on_arrival' && (
                    <span className="text-[10px] text-amber-800 ml-1 font-normal">
                      (Payable to courier on arrival)
                    </span>
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between border-b border-[#0B0B0B]/8 pb-2">
              <span className="text-[#0B0B0B]/70">Discount:</span>
              <span className="font-medium tabular-nums text-[#0B0B0B]">₦0</span>
            </div>
            <div className="flex justify-between pt-1 font-semibold text-sm text-[#0B0B0B]">
              <span>Total Paid Online:</span>
              <span className="font-display text-[#701F36]">
                {formatNaira(
                  confirmedSummary?.totalPaid ??
                    (confirmedSummary?.subtotal ?? 0) + (confirmedSummary?.deliveryFee ?? 0)
                )}
              </span>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-[#0B0B0B]/75">
            Your payment has been verified directly through Paystack and your order is now in preparation with the LUNA ROYALE atelier. You can monitor fulfillment updates at any time in My Orders.
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
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Standard Cart & Checkout View
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="border-b border-[#0B0B0B]/12 pb-8">
        <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
          LUNA ROYALE Bag
        </p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-normal tracking-wide text-[#0B0B0B]">
          Shopping Cart & Checkout
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-[#0B0B0B]/15 text-[#701F36]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg text-[#0B0B0B]">
            Your bag is empty
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
          <div className="space-y-6 lg:col-span-7">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex flex-col sm:flex-row gap-4 border border-[#0B0B0B]/12 bg-white p-4 sm:p-5"
              >
                <div className="h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 bg-[#F4F1E8]">
                  <ProductMedia
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] tracking-wider uppercase text-[#701F36]">
                          {item.categoryLabel}
                        </span>
                        <h3 className="font-display text-base text-[#0B0B0B]">
                          {item.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId)}
                        aria-label={`Remove ${item.name}`}
                        className="text-[#0B0B0B]/40 hover:text-[#701F36] transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-1 font-mono text-xs tabular-nums text-[#0B0B0B]/70">
                      {formatNaira(item.price)} each
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#0B0B0B]/8 pt-3">
                    <div className="flex items-center border border-[#0B0B0B]/20">
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

          {/* Checkout & Delivery Calculation */}
          <div className="lg:col-span-5">
            <div className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-6 sm:p-8">
              <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
                Order & Delivery Summary
              </h2>

              {!user ? (
                <div className="mt-6 border border-[#0B0B0B]/15 bg-white p-5 text-center">
                  <p className="text-xs leading-relaxed text-[#0B0B0B]/75">
                    Please sign in to your LUNA ROYALE account to save your delivery location and complete payment securely.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('account')}
                    className="mt-4 w-full bg-[#701F36] py-3.5 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors"
                  >
                    Sign In to Checkout
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="mt-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#0B0B0B]/10 pb-2">
                    <h3 className="font-display text-xs tracking-wider uppercase text-[#0B0B0B]">
                      Delivery Destination
                    </h3>
                    <span className="text-[10px] text-[#701F36] font-medium uppercase tracking-wider flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Auto Rate Calculation
                    </span>
                  </div>

                  {errorMessage && (
                    <div className="border border-[#701F36]/40 bg-[#701F36]/5 p-3 text-xs text-[#701F36]">
                      {errorMessage}
                    </div>
                  )}

                  {/* Recipient Details */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="checkout-recipient"
                        className="block text-[11px] font-medium text-[#0B0B0B]/80"
                      >
                        Recipient Full Name
                      </label>
                      <input
                        id="checkout-recipient"
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-phone"
                        className="block text-[11px] font-medium text-[#0B0B0B]/80"
                      >
                        Phone Number
                      </label>
                      <input
                        id="checkout-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 08012345678"
                        className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Country Selection */}
                  <div>
                    <label
                      htmlFor="checkout-country"
                      className="block text-[11px] font-medium text-[#0B0B0B]/80"
                    >
                      Country
                    </label>
                    <select
                      id="checkout-country"
                      value={country}
                      onChange={(e) => {
                        setCountry(e.target.value);
                        if (e.target.value === 'Nigeria') {
                          setStateName('Lagos');
                          setCityOrArea('Ikeja');
                        } else {
                          setCityOrArea(e.target.value);
                        }
                      }}
                      className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none cursor-pointer"
                    >
                      <option value="Nigeria">Nigeria (Domestic Rates)</option>
                      <option value="Ghana">Ghana (Quote Required)</option>
                      <option value="Cotonou">Cotonou (Quote Required)</option>
                      <option value="Liberia">Liberia (Quote Required)</option>
                      <option value="Egypt">Egypt (Quote Required)</option>
                      <option value="USA">USA (Quote Required)</option>
                      <option value="UK">UK (Quote Required)</option>
                      <option value="Other International">Other international destinations</option>
                    </select>
                  </div>

                  {/* Nigeria Destination Flow */}
                  {country === 'Nigeria' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* State Selection */}
                        <div>
                          <label
                            htmlFor="checkout-state"
                            className="block text-[11px] font-medium text-[#0B0B0B]/80"
                          >
                            State / Region
                          </label>
                          <select
                            id="checkout-state"
                            value={stateName}
                            onChange={(e) => {
                              const nextState = e.target.value;
                              setStateName(nextState);
                              // Pick sensible first default for state
                              if (nextState === 'Lagos') setCityOrArea('Ikeja');
                              else if (nextState === 'Edo') setCityOrArea('Benin');
                              else if (nextState === 'Delta') setCityOrArea('Asaba');
                              else if (nextState === 'FCT Abuja') setCityOrArea('GUO Abuja Utako');
                              else if (nextState === 'Oyo') setCityOrArea('Ibadan');
                              else if (nextState === 'Ogun') setCityOrArea('Abeokuta');
                              else if (nextState === 'Anambra') setCityOrArea('Awka');
                              else if (nextState === 'Rivers') setCityOrArea('Port Harcourt');
                              else if (nextState === 'Imo') setCityOrArea('Owerri');
                              else if (nextState === 'Enugu') setCityOrArea('Enugu');
                              else if (nextState === 'Abia') setCityOrArea('Aba');
                              else if (nextState === 'Kaduna') setCityOrArea('Kaduna');
                              else if (nextState === 'Kano') setCityOrArea('Kano');
                              else setCityOrArea('');
                            }}
                            className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none cursor-pointer"
                          >
                            <option value="Lagos">Lagos (73 Destinations)</option>
                            <option value="Edo">Edo (Benin, Auchi, Ekpoma)</option>
                            <option value="Delta">Delta (Asaba, Warri, Agbor, Sapele...)</option>
                            <option value="FCT Abuja">FCT Abuja (Utako, Gwarimpa, Kubwa...)</option>
                            <option value="Oyo">Oyo (Ibadan, Ogbomosho, Oyo)</option>
                            <option value="Ogun">Ogun (Abeokuta, Sagamu, Sango Otta...)</option>
                            <option value="Anambra">Anambra (Onitsha, Awka, Nnewi...)</option>
                            <option value="Rivers">Rivers (Port Harcourt, Choba)</option>
                            <option value="Abia">Abia (Aba, Umuahia)</option>
                            <option value="Imo">Imo (Owerri, Orlu, Mbaise, Anara)</option>
                            <option value="Enugu">Enugu</option>
                            <option value="Ebonyi">Ebonyi (Abakaliki, Afikpo)</option>
                            <option value="Cross River">Cross River (Calabar, Ogoja)</option>
                            <option value="Akwa Ibom">Akwa Ibom (Uyo)</option>
                            <option value="Bayelsa">Bayelsa</option>
                            <option value="Kwara">Kwara (Ilorin)</option>
                            <option value="Ondo">Ondo (Akure)</option>
                            <option value="Osun">Osun (Osogbo, Ile Ife, Ede)</option>
                            <option value="Ekiti">Ekiti (Ado-Ekiti, Ikole, Ijero...)</option>
                            <option value="Kogi">Kogi (Lokoja)</option>
                            <option value="Benue">Benue (Makurdi)</option>
                            <option value="Kaduna">Kaduna (Kaduna, Zaria)</option>
                            <option value="Kano">Kano</option>
                            <option value="Plateau">Plateau (Jos)</option>
                            <option value="Bauchi">Bauchi</option>
                            <option value="Taraba">Taraba (Jalingo)</option>
                            <option value="Adamawa">Adamawa (Yola)</option>
                            <option value="Nasarawa">Nasarawa (Mararaba)</option>
                            <option value="Yobe">Yobe</option>
                            <option value="Katsina">Katsina</option>
                            <option value="Zamfara">Zamfara</option>
                            <option value="Kebbi">Kebbi</option>
                          </select>
                        </div>

                        {/* City / Town / Destination Area */}
                        <div>
                          <label
                            htmlFor="checkout-city"
                            className="block text-[11px] font-medium text-[#0B0B0B]/80"
                          >
                            Destination Area / Town
                          </label>
                          <input
                            id="checkout-city"
                            type="text"
                            list="city-datalist"
                            required
                            value={cityOrArea}
                            onChange={(e) => setCityOrArea(e.target.value)}
                            placeholder="Type or pick destination"
                            className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                          />
                          <datalist id="city-datalist">
                            {deliveryRates
                              .filter((r) => r.active && r.region !== 'international')
                              .map((r) => (
                                <option
                                  key={r.id}
                                  value={r.destination}
                                >
                                  {r.destination} ({r.courier} — ₦{r.price?.toLocaleString()})
                                </option>
                              ))}
                          </datalist>
                        </div>
                      </div>

                      {/* Quick Lagos Location Quick-Picks when State is Lagos */}
                      {stateName === 'Lagos' && (
                        <div>
                          <label className="block text-[10px] text-[#0B0B0B]/60 uppercase tracking-wider mb-1">
                            Lagos Destination Quick-Select (All 73 official destinations)
                          </label>
                          <select
                            value={cityOrArea}
                            onChange={(e) => setCityOrArea(e.target.value)}
                            className="w-full border border-[#0B0B0B]/20 bg-white px-2.5 py-1.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                          >
                            <option value="">Select a Lagos area...</option>
                            {deliveryRates
                              .filter((r) => r.region === 'lagos' && r.active)
                              .map((r) => (
                                <option key={r.id} value={r.destination}>
                                  {r.destination} — ₦{r.price?.toLocaleString()}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Street Address */}
                  <div>
                    <label
                      htmlFor="checkout-street"
                      className="block text-[11px] font-medium text-[#0B0B0B]/80"
                    >
                      Full Delivery Address
                    </label>
                    <input
                      id="checkout-street"
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="House number, street name, landmarks"
                      className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                    />
                  </div>

                  {/* Delivery Notes */}
                  <div>
                    <label
                      htmlFor="checkout-notes"
                      className="block text-[11px] font-medium text-[#0B0B0B]/80"
                    >
                      Delivery Notes (Optional)
                    </label>
                    <input
                      id="checkout-notes"
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Special handling instructions, apartment suite..."
                      className="mt-1 w-full border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                    />
                  </div>

                  {/* ROUTE AND PRICING FEEDBACK BOX */}
                  <div className="pt-2">
                    {/* 1. International Quote Message */}
                    {isQuoteRequired && (
                      <div className="border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-2 font-medium">
                          <Globe className="h-4 w-4 text-amber-800" />
                          <span>International delivery fee requires a logistics quote.</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-800/90">
                          Because no fixed international rates are set and customs duties vary by country, our concierge logistics team calculates the courier fee after assessing destination customs requirements.
                        </p>
                      </div>
                    )}

                    {/* 2. Unavailable Location Notice */}
                    {isUnavailable && (
                      <div className="border border-red-200 bg-red-50 p-4 text-xs text-red-900 space-y-1.5">
                        <div className="flex items-center gap-2 font-medium">
                          <AlertCircle className="h-4 w-4 text-red-700" />
                          <span>
                            Delivery fee currently unavailable for this location. Please contact customer support.
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-red-800/90">
                          The entered area is outside our automatically quoted routes. Please choose a nearby hub or contact our concierge for customized arrangements.
                        </p>
                      </div>
                    )}

                    {/* 3. Multiple Courier Routes Available */}
                    {!isQuoteRequired &&
                      !isUnavailable &&
                      lookupResult.options.length > 1 && (
                        <div className="border border-[#701F36]/25 bg-white p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#701F36] uppercase tracking-wider">
                              Select Courier Route
                            </span>
                            <span className="text-[10px] text-[#0B0B0B]/60">
                              {lookupResult.options.length} routes available
                            </span>
                          </div>
                          <div className="space-y-2">
                            {lookupResult.options.map((option) => (
                              <label
                                key={option.id}
                                className={`flex items-center justify-between border p-2.5 cursor-pointer transition-colors ${
                                  selectedRate?.id === option.id
                                    ? 'border-[#701F36] bg-[#701F36]/5'
                                    : 'border-[#0B0B0B]/12 hover:border-[#0B0B0B]/30'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="radio"
                                    name="courier_option"
                                    checked={selectedRate?.id === option.id}
                                    onChange={() => setSelectedRateId(option.id)}
                                    className="accent-[#701F36]"
                                  />
                                  <div>
                                    <p className="font-medium text-xs text-[#0B0B0B]">
                                      {option.courier}
                                    </p>
                                    <p className="text-[10px] text-[#0B0B0B]/60">
                                      {option.destination}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-display font-semibold text-xs tabular-nums text-[#701F36]">
                                  {formatNaira(option.price || 0)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* 4. Single Matching Courier Route */}
                    {!isQuoteRequired &&
                      !isUnavailable &&
                      lookupResult.options.length === 1 &&
                      selectedRate && (
                        <div className="border border-emerald-600/30 bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-medium text-emerald-800">
                              Courier Route Identified
                            </span>
                            <p className="font-medium text-[#0B0B0B]">
                              {selectedRate.courier} — {selectedRate.destination}
                            </p>
                          </div>
                          <span className="font-display font-semibold text-sm tabular-nums text-emerald-900">
                            {formatNaira(selectedRate.price || 0)}
                          </span>
                        </div>
                      )}

                    {/* 5. Admin-configured Pay on Arrival Option (if allowed for route) */}
                    {selectedRate?.payOnArrivalAllowed && (
                      <div className="mt-3 border border-amber-300 bg-amber-50/70 p-3 text-xs space-y-2">
                        <span className="font-medium text-amber-900 block">
                          Delivery Payment Method:
                        </span>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="delivery_payment_method"
                              checked={deliveryPaymentMethod === 'paystack'}
                              onChange={() => setDeliveryPaymentMethod('paystack')}
                              className="accent-[#701F36]"
                            />
                            <span>
                              Pay products & delivery together with Paystack (Recommended)
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="delivery_payment_method"
                              checked={deliveryPaymentMethod === 'courier_on_arrival'}
                              onChange={() =>
                                setDeliveryPaymentMethod('courier_on_arrival')
                              }
                              className="accent-[#701F36]"
                            />
                            <span>
                              Pay products with Paystack now, pay delivery (
                              {formatNaira(deliveryFee)}) directly to courier on arrival
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRICE BREAKDOWN (Product subtotal, delivery fee, and total payable separately) */}
                  <div className="border-t border-[#0B0B0B]/12 pt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between text-[#0B0B0B]/75">
                      <span>Product Subtotal:</span>
                      <span className="font-medium tabular-nums text-[#0B0B0B]">
                        {formatNaira(subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between text-[#0B0B0B]/75">
                      <span>Delivery Fee:</span>
                      <span className="font-medium tabular-nums text-[#701F36]">
                        {isQuoteRequired
                          ? 'Quote required'
                          : isUnavailable
                            ? 'Unavailable'
                            : formatNaira(deliveryFee)}
                      </span>
                    </div>

                    <div className="flex justify-between text-[#0B0B0B]/75">
                      <span>Discount:</span>
                      <span className="font-medium tabular-nums text-[#0B0B0B]">
                        ₦0
                      </span>
                    </div>

                    {isPayOnArrival && (
                      <div className="border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 space-y-1">
                        <div className="flex justify-between">
                          <span>Paystack Online Amount:</span>
                          <span className="font-medium">{formatNaira(paystackAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Outstanding Delivery (Due on arrival):</span>
                          <span className="font-medium">{formatNaira(deliveryFee)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-[#0B0B0B]/12 pt-2 text-sm font-semibold text-[#0B0B0B]">
                      <span>Total Payable:</span>
                      <span className="font-display text-base text-[#701F36] tabular-nums">
                        {isQuoteRequired
                          ? 'Quote required'
                          : formatNaira(isPayOnArrival ? paystackAmount : totalPayable)}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        items.length === 0 ||
                        isQuoteRequired ||
                        isUnavailable ||
                        !selectedRate
                      }
                      className="w-full bg-[#701F36] py-3.5 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#F8F6EF]" />
                          <span>Initializing Paystack...</span>
                        </>
                      ) : isQuoteRequired ? (
                        <span>Quote Required Before Payment</span>
                      ) : isUnavailable ? (
                        <span>Delivery Fee Unavailable</span>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          <span>
                            Pay {formatNaira(paystackAmount)} with Paystack
                          </span>
                        </>
                      )}
                    </button>

                    <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-[#0B0B0B]/60">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                      <span>
                        Secure transaction powered by Paystack Live. No gateway surcharge.
                      </span>
                    </div>
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
