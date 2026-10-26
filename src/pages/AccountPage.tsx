import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  ExternalLink,
  Heart,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { AppSection, DeliveryInfo, Order, OrderStatus, User } from '../types';
import {
  completeIframeHandoffSignIn,
  createRedirectHandoffId,
  ensureAuthRelayReady,
  formatFirebaseAuthError,
  initiateGoogleRedirectSignIn,
  logoutUser,
  registerWithEmail,
  signInWithEmail,
  updateUserProfileDetails,
} from '../services/authService';
import { formatDisplayDate, formatNaira } from '../services/firestoreService';
import { isUserAdmin } from '../services/adminService';
import {
  checkPaymentGatewayStatus,
  initializePaymentTransaction,
  markOrderPaid,
  verifyPaymentTransaction,
} from '../services/orderService';
import { auth, getUserFriendlyErrorMessage } from '../services/firebase';

interface TrackingStage {
  step: number;
  label: string;
  sub: string;
}

const SHIPPING_STAGES: TrackingStage[] = [
  { step: 1, label: 'Order Placed', sub: 'Received in atelier' },
  { step: 2, label: 'Confirmed', sub: 'Verified & authorized' },
  { step: 3, label: 'In Atelier', sub: 'Packaging & seal' },
  { step: 4, label: 'In Transit', sub: 'Courier dispatch' },
  { step: 5, label: 'Delivered', sub: 'Hand-delivered' },
];

function getShippingStageIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 1;
    case 'confirmed':
      return 2;
    case 'processing':
      return 3;
    case 'shipped':
      return 4;
    case 'delivered':
      return 5;
    case 'cancelled':
      return 0;
    default:
      return 1;
  }
}

function getStatusBadgeStyle(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'border-amber-600/30 bg-amber-500/10 text-amber-800';
    case 'confirmed':
      return 'border-blue-600/30 bg-blue-500/10 text-blue-800';
    case 'processing':
      return 'border-[#701F36]/30 bg-[#701F36]/10 text-[#701F36]';
    case 'shipped':
      return 'border-indigo-600/30 bg-indigo-500/10 text-indigo-800';
    case 'delivered':
      return 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800';
    case 'cancelled':
      return 'border-stone-400 bg-stone-100 text-stone-700';
    default:
      return 'border-[#0B0B0B]/20 bg-[#F4F1E8] text-[#0B0B0B]';
  }
}

function getStatusHumanTitle(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Order Placed — Awaiting Confirmation';
    case 'confirmed':
      return 'Order Confirmed — Queued for Preparation';
    case 'processing':
      return 'In Atelier — Crafting, Packaging & Inspection';
    case 'shipped':
      return 'Dispatched — In Transit via Priority Courier';
    case 'delivered':
      return 'Delivered — Hand-Delivered to Destination';
    case 'cancelled':
      return 'Order Cancelled';
    default:
      return status;
  }
}

function getStatusEtaText(status: OrderStatus): string {
  switch (status) {
    case 'shipped':
      return 'Estimated delivery within 24–48 hours across Nigeria';
    case 'processing':
      return 'Atelier dispatch scheduled in 1–2 business days';
    case 'confirmed':
      return 'Scheduled for white-glove curation today';
    case 'pending':
      return 'Pending transaction confirmation';
    case 'delivered':
      return 'Completed hand-delivery';
    case 'cancelled':
      return 'No active delivery';
    default:
      return 'Standard priority shipping';
  }
}

interface AccountPageProps {
  user: User | null;
  isAuthReady: boolean;
  redirectLoading: boolean;
  redirectError: string | null;
  userOrders: Order[];
  ordersLoading: boolean;
  initialTab?: 'profile' | 'orders' | 'delivery';
  wishlistCount: number;
  cartCount: number;
  onNavigate: (section: AppSection) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  user,
  isAuthReady,
  redirectLoading,
  redirectError,
  userOrders,
  ordersLoading,
  initialTab = 'profile',
  wishlistCount,
  cartCount,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'delivery'>(
    initialTab
  );
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [iframeRedirectLaunched, setIframeRedirectLaunched] = useState(false);
  const [handoffId] = useState<string>(() => createRedirectHandoffId());

  useEffect(() => {
    if (!user) {
      ensureAuthRelayReady().catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!iframeRedirectLaunched || user) return;

    let cancelled = false;
    const pollInterval = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/auth/redirect-handoff/${encodeURIComponent(handoffId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.ready && (data.idToken || data.accessToken)) {
          cancelled = true;
          window.clearInterval(pollInterval);
          setAuthLoading(true);
          try {
            await completeIframeHandoffSignIn(data.idToken, data.accessToken);
          } catch (err) {
            setAuthError(formatFirebaseAuthError(err));
          } finally {
            setAuthLoading(false);
          }
        }
      } catch {
        // Ignore transient polling errors
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(pollInterval);
    };
  }, [iframeRedirectLaunched, handoffId, user]);

  // Profile & Delivery form state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Order Tracking state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  // Customer Order Payment States (for confirmed worldwide shipping)
  const [activePaymentOrder, setActivePaymentOrder] = useState<{
    orderId: string;
    reference: string;
    authorizationUrl: string;
  } | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);

  // Check URL parameters for returned Paystack redirect
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paystackRef =
      searchParams.get('lr_paystack_ref') ||
      searchParams.get('reference') ||
      searchParams.get('trxref');
    const orderIdFromUrl = searchParams.get('order_id');

    if (paystackRef) {
      verifyPaymentTransaction(paystackRef)
        .then(async (res) => {
          if (res.verified && res.transaction?.status === 'success') {
            const targetOrderId = orderIdFromUrl || res.transaction?.orderId;
            if (targetOrderId) {
              await markOrderPaid(targetOrderId, paystackRef, res.transaction?.paidAt).catch(() => {});
            }
            setPaymentSuccessMessage(`Payment verified successfully with Paystack (Ref: ${paystackRef}).`);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Polling interval for active payment session
  useEffect(() => {
    if (!activePaymentOrder) return;
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await verifyPaymentTransaction(activePaymentOrder.reference);
        if (!isMounted) return;
        if (res.verified && res.transaction?.status === 'success') {
          clearInterval(interval);
          await markOrderPaid(
            activePaymentOrder.orderId,
            activePaymentOrder.reference,
            res.transaction?.paidAt
          ).catch(() => {});
          setPaymentSuccessMessage(
            `Payment successfully completed and verified for Order #${activePaymentOrder.orderId.slice(0, 10)}.`
          );
          setActivePaymentOrder(null);
        }
      } catch {
        // Silently continue polling
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activePaymentOrder]);

  const handleManualVerifyPayment = async () => {
    if (!activePaymentOrder) return;
    setIsVerifyingManual(true);
    setPaymentError(null);
    try {
      const res = await verifyPaymentTransaction(activePaymentOrder.reference);
      if (res.verified && res.transaction?.status === 'success') {
        await markOrderPaid(
          activePaymentOrder.orderId,
          activePaymentOrder.reference,
          res.transaction?.paidAt
        ).catch(() => {});
        setPaymentSuccessMessage(
          `Payment successfully completed and verified for Order #${activePaymentOrder.orderId.slice(0, 10)}.`
        );
        setActivePaymentOrder(null);
      } else {
        setPaymentError(
          'Payment has not yet been completed. Please complete payment in the Paystack window and click verify again.'
        );
      }
    } catch (err) {
      setPaymentError(
        getUserFriendlyErrorMessage(err, 'Unable to verify transaction with Paystack.')
      );
    } finally {
      setIsVerifyingManual(false);
    }
  };

  const handleInitiateOrderPayment = async (order: Order) => {
    if (order.shippingStatus !== 'confirmed') {
      setPaymentError('Shipping fee has not yet been confirmed by the atelier.');
      return;
    }
    setPayingOrderId(order.id);
    setPaymentError(null);
    setPaymentSuccessMessage(null);

    try {
      const status = await checkPaymentGatewayStatus();
      if (!status.configured) {
        setPaymentError('Paystack Live payment gateway is not yet configured on the server.');
        return;
      }

      const idToken = await auth.currentUser?.getIdToken();
      const res = await initializePaymentTransaction({
        email: order.customerEmail || user?.email || '',
        amountNaira: order.totalAmount,
        orderId: order.id,
        idToken,
      });

      setActivePaymentOrder({
        orderId: order.id,
        reference: res.reference,
        authorizationUrl: res.authorization_url,
      });

      // Attempt to open Paystack checkout window
      window.open(res.authorization_url, '_blank');
    } catch (err) {
      setPaymentError(
        getUserFriendlyErrorMessage(
          err,
          'Unable to initialize payment transaction with Paystack.'
        )
      );
    } finally {
      setPayingOrderId(null);
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (userOrders.length > 0 && expandedOrderId === null) {
      setExpandedOrderId(userOrders[0].id);
    }
  }, [userOrders, expandedOrderId]);

  const filteredOrders = useMemo(() => {
    return userOrders.filter((order) => {
      if (orderStatusFilter === 'active') {
        if (order.status === 'delivered' || order.status === 'cancelled') return false;
      } else if (orderStatusFilter === 'delivered') {
        if (order.status !== 'delivered') return false;
      } else if (orderStatusFilter === 'cancelled') {
        if (order.status !== 'cancelled') return false;
      }

      const q = orderSearchQuery.trim().toLowerCase();
      if (!q) return true;

      const matchId = order.id.toLowerCase().includes(q);
      const matchRef = order.paymentReference?.toLowerCase().includes(q);
      const matchItem = order.items.some((i) => i.name.toLowerCase().includes(q));
      const matchCity = order.deliveryInfo?.city?.toLowerCase().includes(q);

      return matchId || Boolean(matchRef) || matchItem || Boolean(matchCity);
    });
  }, [userOrders, orderStatusFilter, orderSearchQuery]);

  useEffect(() => {
    if (user) {
      setProfileName(user.fullName || '');
      setProfilePhone(user.phone || '');
      setRecipientName(user.deliveryInfo?.recipientName || user.fullName || '');
      setDeliveryPhone(user.deliveryInfo?.phone || user.phone || '');
      setStreetAddress(user.deliveryInfo?.streetAddress || '');
      setCity(user.deliveryInfo?.city || '');
      setStateName(user.deliveryInfo?.state || '');
      setCountry(user.deliveryInfo?.country || 'Nigeria');
      setDeliveryNotes(user.deliveryInfo?.deliveryNotes || '');
    }
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'register') {
        await registerWithEmail(email, password, fullNameInput);
      } else {
        await signInWithEmail(email, password);
      }
      setEmail('');
      setPassword('');
      setFullNameInput('');
    } catch (err: unknown) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleRedirect = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setIframeRedirectLaunched(true);
    try {
      await initiateGoogleRedirectSignIn(handoffId);
    } catch (err) {
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfileAndDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileFeedback(null);
    setProfileError(null);

    const hasDeliveryFields =
      streetAddress.trim().length > 0 ||
      city.trim().length > 0 ||
      stateName.trim().length > 0;

    const deliveryInfo: DeliveryInfo | null = hasDeliveryFields
      ? {
          recipientName: recipientName.trim() || profileName.trim(),
          phone: deliveryPhone.trim() || profilePhone.trim(),
          streetAddress: streetAddress.trim(),
          city: city.trim(),
          state: stateName.trim(),
          country: country.trim() || 'Nigeria',
          deliveryNotes: deliveryNotes.trim(),
        }
      : user.deliveryInfo;

    try {
      await updateUserProfileDetails(user.uid, {
        fullName: profileName,
        phone: profilePhone,
        deliveryInfo,
      });
      setProfileFeedback('Your account and delivery information have been updated.');
    } catch (err) {
      setProfileError(
        getUserFriendlyErrorMessage(
          err,
          'Unable to save profile changes. Please check your permissions.'
        )
      );
    } finally {
      setSavingProfile(false);
    }
  };

  if (!isAuthReady || redirectLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto h-8 w-8 animate-spin border-2 border-[#701F36] border-t-transparent" />
        <p className="mt-4 font-display text-sm tracking-wider text-[#0B0B0B]">
          Verifying LUNA ROYALE Session...
        </p>
      </div>
    );
  }

  // Unauthenticated View: Sign In & Create Account + Google Redirect Auth
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
        <div className="border border-[#0B0B0B]/15 bg-[#F4F1E8]/60 p-8 sm:p-10">
          <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase text-center">
            LUNA ROYALE Client Portal
          </p>
          <h1 className="mt-2 font-display text-2xl text-center tracking-wide text-[#0B0B0B]">
            {authMode === 'signin' ? 'Sign In' : 'Create an Account'}
          </h1>

          {/* Mode Toggle */}
          <div className="mt-6 grid grid-cols-2 border border-[#0B0B0B]/15 bg-[#F8F6EF] p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setAuthError(null);
              }}
              className={`py-2 text-xs font-medium tracking-wider transition-colors ${
                authMode === 'signin'
                  ? 'bg-[#701F36] text-[#F8F6EF]'
                  : 'text-[#0B0B0B]/70 hover:text-[#0B0B0B]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
              className={`py-2 text-xs font-medium tracking-wider transition-colors ${
                authMode === 'register'
                  ? 'bg-[#701F36] text-[#F8F6EF]'
                  : 'text-[#0B0B0B]/70 hover:text-[#0B0B0B]'
              }`}
            >
              Create Account
            </button>
          </div>

          {(authError || redirectError) && (
            <div className="mt-5 border border-[#701F36]/40 bg-[#701F36]/5 p-3 text-xs text-[#701F36]">
              {authError || redirectError}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
            {authMode === 'register' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-medium text-[#0B0B0B]/80"
                >
                  Full Name
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-[#0B0B0B]/80"
              >
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-[#0B0B0B]/80"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#701F36] py-3.5 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#0B0B0B]/12" />
            <span className="text-[11px] text-[#0B0B0B]/45 uppercase">or</span>
            <div className="h-px flex-1 bg-[#0B0B0B]/12" />
          </div>

          {/* Google Sign-In strictly using signInWithRedirect() + getRedirectResult() */}
          <div>
            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleRedirect}
              className="flex w-full items-center justify-center gap-2.5 border border-[#0B0B0B]/25 bg-white py-3 text-xs font-medium tracking-wider text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors disabled:opacity-50"
            >
              <span>Continue with Google</span>
            </button>
            {iframeRedirectLaunched && (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-[#0B0B0B]/65">
                Complete Google Sign-In in the opened tab. Your LUNA ROYALE session will sync automatically.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = isUserAdmin(user);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Authenticated Account Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#0B0B0B]/12 pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
            {isAdmin ? 'Admin Account' : 'Client Account'}
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-normal tracking-wide text-[#0B0B0B]">
            {user.fullName || 'My Account'}
          </h1>
          <p className="mt-1 text-xs text-[#0B0B0B]/65">{user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-2 bg-[#701F36] px-4 py-2.5 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => logoutUser()}
            className="inline-flex items-center gap-2 border border-[#0B0B0B]/25 px-4 py-2.5 text-xs font-medium tracking-wider text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36] transition-colors whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Account Navigation Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-[#0B0B0B]/10 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
            activeTab === 'profile'
              ? 'bg-[#701F36] text-[#F8F6EF]'
              : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          <span>Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
            activeTab === 'orders'
              ? 'bg-[#701F36] text-[#F8F6EF]'
              : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          <span className="tabular-nums">My Orders ({userOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
            activeTab === 'delivery'
              ? 'bg-[#701F36] text-[#F8F6EF]'
              : 'border border-[#0B0B0B]/15 text-[#0B0B0B]/80 hover:border-[#701F36]'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Delivery Information</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('wishlist')}
          className="inline-flex items-center gap-2 border border-[#0B0B0B]/15 px-4 py-2 text-xs font-medium tracking-wider text-[#0B0B0B]/80 hover:border-[#701F36] whitespace-nowrap transition-colors"
        >
          <Heart className="h-3.5 w-3.5" />
          <span className="tabular-nums">Wishlist ({wishlistCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('cart')}
          className="inline-flex items-center gap-2 border border-[#0B0B0B]/15 px-4 py-2 text-xs font-medium tracking-wider text-[#0B0B0B]/80 hover:border-[#701F36] whitespace-nowrap transition-colors"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span className="tabular-nums">Cart ({cartCount})</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="inline-flex items-center gap-2 border border-[#701F36]/30 bg-[#701F36]/10 px-4 py-2 text-xs font-medium tracking-wider text-[#701F36] hover:bg-[#701F36] hover:text-[#F8F6EF] whitespace-nowrap transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin Dashboard</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-10">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Read-Only Summary Card (Never invents missing information) */}
            <div className="lg:col-span-5 border border-[#0B0B0B]/12 bg-[#F4F1E8]/60 p-6 sm:p-8">
              <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
                Profile Summary
              </h2>
              <dl className="mt-6 divide-y divide-[#0B0B0B]/10 text-xs">
                <div className="py-3.5 flex justify-between gap-4">
                  <dt className="font-medium text-[#0B0B0B]/70">Full Name</dt>
                  <dd className="text-right text-[#0B0B0B]">
                    {user.fullName ? user.fullName : 'Not provided'}
                  </dd>
                </div>
                <div className="py-3.5 flex justify-between gap-4">
                  <dt className="font-medium text-[#0B0B0B]/70">Email</dt>
                  <dd className="text-right text-[#0B0B0B]">{user.email}</dd>
                </div>
                <div className="py-3.5 flex justify-between gap-4">
                  <dt className="font-medium text-[#0B0B0B]/70">Phone Number</dt>
                  <dd className="text-right text-[#0B0B0B]">
                    {user.phone ? (
                      user.phone
                    ) : (
                      <span className="text-[#0B0B0B]/45">
                        No phone number provided yet
                      </span>
                    )}
                  </dd>
                </div>
                <div className="py-3.5 flex justify-between gap-4">
                  <dt className="font-medium text-[#0B0B0B]/70">
                    Delivery Address
                  </dt>
                  <dd className="text-right text-[#0B0B0B]">
                    {user.deliveryInfo?.streetAddress ? (
                      `${user.deliveryInfo.streetAddress}, ${user.deliveryInfo.city}`
                    ) : (
                      <span className="text-[#0B0B0B]/45">
                        No delivery address saved yet
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Edit Profile Form */}
            <form
              onSubmit={handleSaveProfileAndDelivery}
              className="lg:col-span-7 border border-[#0B0B0B]/12 bg-[#F8F6EF] p-6 sm:p-8"
            >
              <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
                Update Profile Details
              </h2>

              {profileFeedback && (
                <div className="mt-4 border border-[#0B0B0B]/20 bg-[#F4F1E8] p-3 text-xs text-[#0B0B0B]">
                  {profileFeedback}
                </div>
              )}
              {profileError && (
                <div className="mt-4 border border-[#701F36]/40 bg-[#701F36]/5 p-3 text-xs text-[#701F36]">
                  {profileError}
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="profile-fullname"
                    className="block text-xs font-medium text-[#0B0B0B]/80"
                  >
                    Full Name
                  </label>
                  <input
                    id="profile-fullname"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-phone"
                    className="block text-xs font-medium text-[#0B0B0B]/80"
                  >
                    Phone Number
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="Add your phone number"
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'delivery' && (
          <form
            onSubmit={handleSaveProfileAndDelivery}
            className="max-w-2xl border border-[#0B0B0B]/12 bg-[#F4F1E8]/60 p-6 sm:p-8"
          >
            <h2 className="font-display text-xl tracking-wider text-[#0B0B0B]">
              Delivery Information
            </h2>
            <p className="mt-1 text-xs text-[#0B0B0B]/65">
              Save your preferred delivery recipient and address for LUNA ROYALE orders.
            </p>

            {profileFeedback && (
              <div className="mt-4 border border-[#0B0B0B]/20 bg-[#F8F6EF] p-3 text-xs text-[#0B0B0B]">
                {profileFeedback}
              </div>
            )}
            {profileError && (
              <div className="mt-4 border border-[#701F36]/40 bg-[#701F36]/5 p-3 text-xs text-[#701F36]">
                {profileError}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="del-recipient"
                    className="block text-xs font-medium text-[#0B0B0B]/80"
                  >
                    Recipient Full Name
                  </label>
                  <input
                    id="del-recipient"
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="del-phone"
                    className="block text-xs font-medium text-[#0B0B0B]/80"
                  >
                    Recipient Phone Number
                  </label>
                  <input
                    id="del-phone"
                    type="tel"
                    required
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="del-street"
                  className="block text-xs font-medium text-[#0B0B0B]/80"
                >
                  Street Address
                </label>
                <input
                  id="del-street"
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="del-city"
                    className="block text-xs font-medium text-[#0B0B0B]/80"
                  >
                    City
                  </label>
                  <input
                    id="del-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="del-state"
                    className="block text-xs font-medium text-[#0B0B0B]/80"
                  >
                    State
                  </label>
                  <input
                    id="del-state"
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="del-country"
                    className="block text-xs font-medium text-[#0B0B0B]/80"
                  >
                    Country
                  </label>
                  <input
                    id="del-country"
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="del-notes"
                  className="block text-xs font-medium text-[#0B0B0B]/80"
                >
                  Delivery Instructions (Optional)
                </label>
                <input
                  id="del-notes"
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="mt-1.5 w-full border border-[#0B0B0B]/20 bg-white px-3.5 py-2.5 text-xs text-[#0B0B0B] focus:border-[#701F36] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Delivery Information'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            {/* Header & Order Tracking Summary */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-[#0B0B0B]/10 pb-6">
              <div>
                <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
                  Real-Time Shipping & Atelier Fulfillment
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl text-[#0B0B0B] tabular-nums">
                  Order Tracking ({userOrders.length})
                </h2>
                <p className="mt-1 text-xs text-[#0B0B0B]/65 max-w-xl">
                  Live shipping status, atelier packaging progress, and delivery schedules for your LUNA ROYALE purchases synchronized in real time with Firestore.
                </p>
              </div>

              {/* Status Quick Counters */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 border border-[#0B0B0B]/15 bg-white px-3 py-1.5 text-xs text-[#0B0B0B]">
                  <Truck className="h-3.5 w-3.5 text-[#701F36]" />
                  <span className="tabular-nums">
                    {userOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length} Active
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 border border-[#0B0B0B]/15 bg-white px-3 py-1.5 text-xs text-[#0B0B0B]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="tabular-nums">
                    {userOrders.filter((o) => o.status === 'delivered').length} Delivered
                  </span>
                </span>
              </div>
            </div>

            {/* Payment Notifications & Active Checkout Session */}
            {paymentSuccessMessage && (
              <div className="border border-emerald-600/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-900 flex items-center justify-between">
                <span>{paymentSuccessMessage}</span>
                <button
                  type="button"
                  onClick={() => setPaymentSuccessMessage(null)}
                  className="text-emerald-800 hover:text-emerald-950"
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {paymentError && (
              <div className="border border-[#701F36]/40 bg-[#701F36]/5 p-4 text-xs text-[#701F36] flex items-center justify-between">
                <span>{paymentError}</span>
                <button
                  type="button"
                  onClick={() => setPaymentError(null)}
                  className="text-[#701F36] hover:text-[#0B0B0B]"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {activePaymentOrder && (
              <div className="border border-[#701F36]/30 bg-[#F4F1E8] p-5 shadow-xs text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0B0B0B] uppercase tracking-wider text-[11px]">
                      Paystack Live Checkout Active (Order #{activePaymentOrder.orderId.slice(0, 10)})
                    </p>
                    <p className="text-[#0B0B0B]/70 mt-0.5">
                      A secure payment window was opened. If it was blocked, click below to open it.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={activePaymentOrder.authorizationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 border border-[#0B0B0B]/20 bg-white px-3 py-2 text-xs text-[#0B0B0B] hover:border-[#701F36]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Checkout</span>
                    </a>
                    <button
                      type="button"
                      disabled={isVerifyingManual}
                      onClick={handleManualVerifyPayment}
                      className="inline-flex items-center gap-1.5 bg-[#701F36] px-4 py-2 text-xs font-medium text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] disabled:opacity-50"
                    >
                      {isVerifyingManual ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>I Have Paid — Verify</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePaymentOrder(null)}
                      className="px-2 py-2 text-xs text-[#0B0B0B]/50 hover:text-[#0B0B0B]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            {userOrders.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0B0B0B]/40" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search by Order ID, reference, item name, or city..."
                    className="w-full border border-[#0B0B0B]/20 bg-white py-2 pl-9 pr-8 text-xs text-[#0B0B0B] placeholder:text-[#0B0B0B]/40 focus:border-[#701F36] focus:outline-none"
                  />
                  {orderSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#0B0B0B]/40 hover:text-[#0B0B0B]"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1 border border-[#0B0B0B]/15 bg-[#F8F6EF] p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('all')}
                    className={`px-3 py-1 transition-colors ${
                      orderStatusFilter === 'all'
                        ? 'bg-[#701F36] text-[#F8F6EF] font-medium'
                        : 'text-[#0B0B0B]/70 hover:text-[#0B0B0B]'
                    }`}
                  >
                    All ({userOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('active')}
                    className={`px-3 py-1 transition-colors ${
                      orderStatusFilter === 'active'
                        ? 'bg-[#701F36] text-[#F8F6EF] font-medium'
                        : 'text-[#0B0B0B]/70 hover:text-[#0B0B0B]'
                    }`}
                  >
                    In Progress ({userOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('delivered')}
                    className={`px-3 py-1 transition-colors ${
                      orderStatusFilter === 'delivered'
                        ? 'bg-[#701F36] text-[#F8F6EF] font-medium'
                        : 'text-[#0B0B0B]/70 hover:text-[#0B0B0B]'
                    }`}
                  >
                    Delivered ({userOrders.filter((o) => o.status === 'delivered').length})
                  </button>
                  {userOrders.some((o) => o.status === 'cancelled') && (
                    <button
                      type="button"
                      onClick={() => setOrderStatusFilter('cancelled')}
                      className={`px-3 py-1 transition-colors ${
                        orderStatusFilter === 'cancelled'
                          ? 'bg-[#701F36] text-[#F8F6EF] font-medium'
                          : 'text-[#0B0B0B]/70 hover:text-[#0B0B0B]'
                      }`}
                    >
                      Cancelled
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content states */}
            {ordersLoading ? (
              <div className="border border-[#0B0B0B]/10 bg-[#F4F1E8]/50 p-12 text-center text-xs text-[#0B0B0B]/60">
                <Truck className="mx-auto h-6 w-6 animate-pulse text-[#701F36]" />
                <p className="mt-3">Loading real-time shipping tracking from Firestore...</p>
              </div>
            ) : userOrders.length === 0 ? (
              <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 px-6 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#701F36]/30 bg-white text-[#701F36]">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl text-[#0B0B0B]">
                  No Orders on Record
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#0B0B0B]/65">
                  You have not placed any orders yet. Once an order is completed, its real-time shipping status, courier dispatch, and delivery updates will appear here automatically.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="mt-6 bg-[#701F36] px-6 py-3 text-xs font-medium tracking-wider text-[#F8F6EF] hover:bg-[#0B0B0B] transition-colors"
                >
                  Explore Collection
                </button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="border border-[#0B0B0B]/10 bg-[#F4F1E8]/40 p-10 text-center text-xs">
                <p className="text-[#0B0B0B]/70">No orders match your search or filter criteria.</p>
                <button
                  type="button"
                  onClick={() => {
                    setOrderSearchQuery('');
                    setOrderStatusFilter('all');
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#701F36] hover:underline"
                >
                  <span>Reset Filters</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const stageIndex = getShippingStageIndex(order.status);
                  const isDelivered = order.status === 'delivered';
                  const isCancelled = order.status === 'cancelled';
                  const isActive = !isDelivered && !isCancelled;

                  return (
                    <article
                      key={order.id}
                      className={`border transition-all ${
                        isExpanded
                          ? 'border-[#701F36]/40 bg-[#F4F1E8]/75 shadow-xs'
                          : 'border-[#0B0B0B]/15 bg-[#F4F1E8]/40 hover:border-[#0B0B0B]/30'
                      }`}
                    >
                      {/* Top Bar Summary */}
                      <div className="p-5 sm:p-6 border-b border-[#0B0B0B]/10">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#0B0B0B]">
                                Order #{order.id.slice(0, 10)}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase ${getStatusBadgeStyle(
                                  order.status
                                )}`}
                              >
                                {isActive && (
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                                  </span>
                                )}
                                <span>{order.status}</span>
                              </span>

                              {/* Worldwide Shipping Confirmation Status Badge */}
                              {order.shippingStatus === 'confirmed' ? (
                                <span className="inline-flex items-center gap-1 border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-emerald-800 uppercase">
                                  Shipping Confirmed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 border border-amber-600/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium tracking-wider text-amber-800 uppercase">
                                  Shipping Quote In Review
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-[#0B0B0B]/60">
                              Placed on {formatDisplayDate(order.createdAt)} ·{' '}
                              <span className="text-[#0B0B0B] font-medium">
                                {order.items.reduce((acc, i) => acc + i.quantity, 0)} item
                                {order.items.reduce((acc, i) => acc + i.quantity, 0) > 1 ? 's' : ''}
                              </span>
                              {order.deliveryInfo?.city && (
                                <>
                                  {' '}· Destination: <span className="text-[#0B0B0B] font-medium">{order.deliveryInfo.city}, {order.deliveryInfo.country}</span>
                                </>
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4">
                            <div className="text-right">
                              <p className="text-[10px] text-[#0B0B0B]/50 uppercase tracking-wider">
                                {order.shippingStatus === 'confirmed' ? 'Total Payable' : 'Items Subtotal'}
                              </p>
                              <p className="font-display text-base font-semibold tabular-nums text-[#0B0B0B]">
                                {formatNaira(
                                  order.shippingStatus === 'confirmed'
                                    ? order.totalAmount
                                    : order.subtotal
                                )}
                              </p>
                              <p className="text-[10px] text-[#0B0B0B]/55">
                                {order.shippingStatus === 'confirmed'
                                  ? `Incl. ${formatNaira(order.shippingFee || 0)} shipping`
                                  : '+ Shipping TBD'}
                              </p>
                            </div>

                            {/* Quick Pay Now Button if shipping is confirmed and order is pending */}
                            {order.shippingStatus === 'confirmed' && order.status === 'pending' && (
                              <button
                                type="button"
                                disabled={payingOrderId === order.id}
                                onClick={() => handleInitiateOrderPayment(order)}
                                className="inline-flex items-center gap-1.5 bg-[#701F36] px-3.5 py-2 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50"
                              >
                                {payingOrderId === order.id ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Opening...</span>
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-3.5 w-3.5" />
                                    <span>Pay Now</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrderId(isExpanded ? null : order.id)
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-wider transition-colors ${
                                isExpanded
                                  ? 'bg-[#701F36] text-[#F8F6EF]'
                                  : 'border border-[#0B0B0B]/20 bg-white text-[#0B0B0B] hover:border-[#701F36] hover:text-[#701F36]'
                              }`}
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>{isExpanded ? 'Hide Tracking' : 'Track Order'}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Compact Visual Progress Bar (always visible when not cancelled) */}
                        {!isCancelled && (
                          <div className="mt-4 pt-4 border-t border-[#0B0B0B]/10">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] gap-1 mb-1.5">
                              <span className="font-medium text-[#701F36]">
                                {getStatusHumanTitle(order.status)}
                              </span>
                              <span className="text-[#0B0B0B]/60">
                                {getStatusEtaText(order.status)}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-[#0B0B0B]/10 overflow-hidden">
                              <div
                                className="h-full bg-[#701F36] transition-all duration-500"
                                style={{
                                  width: `${(stageIndex / 5) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expanded Order Tracking Details */}
                      {isExpanded && (
                        <div className="p-5 sm:p-6 space-y-6">
                          {/* Live Shipping Timeline Stepper */}
                          {!isCancelled ? (
                            <div className="border border-[#701F36]/20 bg-white p-5 sm:p-6 shadow-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#0B0B0B]/10 pb-4">
                                <div>
                                  <p className="text-[10px] font-medium tracking-widest uppercase text-[#701F36]">
                                    Live Shipping Progress
                                  </p>
                                  <h4 className="font-display text-base text-[#0B0B0B]">
                                    {getStatusHumanTitle(order.status)}
                                  </h4>
                                </div>
                                <div className="text-left sm:text-right">
                                  <span className="inline-flex items-center gap-1.5 text-xs text-[#0B0B0B]/70">
                                    <Clock className="h-3.5 w-3.5 text-[#701F36]" />
                                    <span>
                                      Status as of {formatDisplayDate(order.updatedAt || order.createdAt)}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Stepper Row */}
                              <div className="mt-6">
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                                  {SHIPPING_STAGES.map((stage) => {
                                    const isDone = stage.step < stageIndex;
                                    const isCurrent = stage.step === stageIndex;

                                    return (
                                      <div key={stage.step} className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <div
                                            className={`flex h-7 w-7 items-center justify-center text-[11px] font-semibold transition-colors ${
                                              isDone
                                                ? 'bg-[#701F36] text-[#F8F6EF]'
                                                : isCurrent
                                                  ? 'border-2 border-[#701F36] bg-[#701F36]/10 text-[#701F36] ring-2 ring-[#701F36]/25'
                                                  : 'border border-[#0B0B0B]/20 bg-white text-[#0B0B0B]/35'
                                            }`}
                                          >
                                            {isDone ? (
                                              <Check className="h-4 w-4" />
                                            ) : (
                                              stage.step
                                            )}
                                          </div>
                                          <div
                                            className={`hidden sm:block h-0.5 flex-1 ${
                                              isDone ? 'bg-[#701F36]' : 'bg-[#0B0B0B]/10'
                                            }`}
                                          />
                                        </div>

                                        <p
                                          className={`mt-2.5 text-xs font-medium leading-tight ${
                                            isCurrent
                                              ? 'text-[#701F36]'
                                              : isDone
                                                ? 'text-[#0B0B0B]'
                                                : 'text-[#0B0B0B]/40'
                                          }`}
                                        >
                                          {stage.label}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-[#0B0B0B]/55 leading-tight">
                                          {stage.sub}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-red-200 bg-red-50/80 p-4 text-xs text-red-800 flex items-start gap-3">
                              <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium">Order Cancelled</p>
                                <p className="mt-1 text-red-700/80">
                                  This order was cancelled. Please contact concierge support if you need assistance with an exchange or billing inquiry.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Shipping Destination & Courier Details */}
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 text-xs">
                            <div className="border border-[#0B0B0B]/10 bg-white p-4">
                              <div className="flex items-center gap-2 border-b border-[#0B0B0B]/10 pb-2.5 mb-2.5">
                                <MapPin className="h-3.5 w-3.5 text-[#701F36]" />
                                <span className="text-[11px] font-medium tracking-wider uppercase text-[#0B0B0B]">
                                  Delivery Address
                                </span>
                              </div>
                              <p className="font-medium text-[#0B0B0B]">
                                {order.deliveryInfo?.recipientName || order.customerName}
                              </p>
                              <p className="text-[#0B0B0B]/70 mt-0.5">
                                Phone: {order.deliveryInfo?.phone || 'Contact on file'}
                              </p>
                              <p className="text-[#0B0B0B]/75 mt-1 leading-relaxed">
                                {order.deliveryInfo?.streetAddress}
                                {order.deliveryInfo?.city ? `, ${order.deliveryInfo.city}` : ''}
                                {order.deliveryInfo?.state ? `, ${order.deliveryInfo.state}` : ''}
                                {order.deliveryInfo?.country ? `, ${order.deliveryInfo.country}` : ''}
                              </p>
                              {order.deliveryInfo?.deliveryNotes && (
                                <p className="mt-2 border-t border-[#0B0B0B]/8 pt-1.5 italic text-[#0B0B0B]/60">
                                  Notes: {order.deliveryInfo.deliveryNotes}
                                </p>
                              )}
                            </div>

                            <div className="border border-[#0B0B0B]/10 bg-white p-4">
                              <div className="flex items-center gap-2 border-b border-[#0B0B0B]/10 pb-2.5 mb-2.5">
                                <Truck className="h-3.5 w-3.5 text-[#701F36]" />
                                <span className="text-[11px] font-medium tracking-wider uppercase text-[#0B0B0B]">
                                  Fulfillment & Verification
                                </span>
                              </div>
                              <dl className="space-y-1.5">
                                <div className="flex justify-between">
                                  <dt className="text-[#0B0B0B]/60">Order Reference:</dt>
                                  <dd className="font-mono text-[#0B0B0B] font-medium select-all">
                                    #{order.id}
                                  </dd>
                                </div>
                                {order.paymentReference && (
                                  <div className="flex justify-between">
                                    <dt className="text-[#0B0B0B]/60">Paystack Ref:</dt>
                                    <dd className="font-mono text-[#0B0B0B] truncate max-w-[150px] select-all">
                                      {order.paymentReference}
                                    </dd>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <dt className="text-[#0B0B0B]/60">Order Placed:</dt>
                                  <dd className="font-mono text-[#0B0B0B]">
                                    {formatDisplayDate(order.createdAt)}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-[#0B0B0B]/60">Last Status Update:</dt>
                                  <dd className="font-mono text-[#0B0B0B]">
                                    {formatDisplayDate(order.updatedAt || order.createdAt)}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </div>

                          {/* Dedicated Worldwide Shipping & Payment Authorization Card */}
                          <div className="border border-[#0B0B0B]/10 bg-white p-4 sm:p-5 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0B0B0B]/10 pb-3 mb-3">
                              <div>
                                <span className="text-[10px] font-medium tracking-wider uppercase text-[#701F36]">
                                  Worldwide White-Glove Courier Service
                                </span>
                                <h5 className="font-display text-sm text-[#0B0B0B]">
                                  {order.shippingStatus === 'confirmed'
                                    ? 'Shipping Fee Confirmed by Atelier'
                                    : 'Shipping Quote Pending Atelier Review'}
                                </h5>
                              </div>
                              {order.shippingStatus === 'confirmed' ? (
                                <span className="inline-flex items-center gap-1 border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                                  Payment Unlocked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 border border-amber-600/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                                  Manual Review In Progress
                                </span>
                              )}
                            </div>

                            {order.shippingStatus === 'pending_confirmation' ? (
                              <div className="space-y-3">
                                <p className="text-[#0B0B0B]/75 leading-relaxed">
                                  Our atelier team is currently reviewing courier rates for{' '}
                                  <span className="font-medium text-[#0B0B0B]">
                                    {order.deliveryInfo?.city}, {order.deliveryInfo?.country}
                                  </span>
                                  . To guarantee white-glove handling and accurate customs clearance, shipping is manually confirmed rather than estimated. Once confirmed, payment will unlock here automatically.
                                </p>
                                <div className="border border-[#0B0B0B]/8 bg-[#F4F1E8]/50 p-3 max-w-sm space-y-1.5">
                                  <div className="flex justify-between text-[#0B0B0B]/70">
                                    <span>Items Subtotal:</span>
                                    <span className="font-medium tabular-nums text-[#0B0B0B]">{formatNaira(order.subtotal)}</span>
                                  </div>
                                  <div className="flex justify-between text-[#0B0B0B]/70">
                                    <span>Worldwide Shipping:</span>
                                    <span className="font-medium text-amber-800">Pending Confirmation</span>
                                  </div>
                                  <div className="flex justify-between border-t border-[#0B0B0B]/8 pt-1.5 font-semibold text-[#0B0B0B]">
                                    <span>Total Payable:</span>
                                    <span className="text-[#0B0B0B]/60 italic font-normal">Calculated upon confirmation</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 border border-[#0B0B0B]/8 bg-[#F4F1E8]/50 p-3.5">
                                  <div>
                                    <span className="text-[10px] text-[#0B0B0B]/60 uppercase">Items Subtotal</span>
                                    <p className="font-medium text-sm tabular-nums text-[#0B0B0B]">{formatNaira(order.subtotal)}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#0B0B0B]/60 uppercase">Confirmed Shipping</span>
                                    <p className="font-medium text-sm tabular-nums text-[#701F36]">
                                      {formatNaira(order.shippingFee || 0)}
                                    </p>
                                    {order.shippingNotes && (
                                      <p className="text-[10px] text-[#0B0B0B]/60 truncate">{order.shippingNotes}</p>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#0B0B0B]/60 uppercase">Total Payable</span>
                                    <p className="font-display font-semibold text-base tabular-nums text-[#0B0B0B]">
                                      {formatNaira(order.totalAmount)}
                                    </p>
                                  </div>
                                </div>

                                {order.status === 'pending' ? (
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#701F36]/25 bg-[#701F36]/5 p-4">
                                    <div>
                                      <p className="font-medium text-[#701F36]">Shipping Confirmed — Ready to Complete Payment</p>
                                      <p className="text-[#0B0B0B]/70 text-[11px] mt-0.5">
                                        Your shipping fee is confirmed. Complete your payment with Paystack to authorize atelier dispatch.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={payingOrderId === order.id}
                                      onClick={() => handleInitiateOrderPayment(order)}
                                      className="inline-flex items-center justify-center gap-2 bg-[#701F36] px-5 py-2.5 text-xs font-medium tracking-wider text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors disabled:opacity-50 whitespace-nowrap self-start sm:self-auto"
                                    >
                                      {payingOrderId === order.id ? (
                                        <>
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          <span>Connecting to Paystack...</span>
                                        </>
                                      ) : (
                                        <>
                                          <CreditCard className="h-3.5 w-3.5" />
                                          <span>Pay with Paystack — {formatNaira(order.totalAmount)}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="border border-emerald-600/20 bg-emerald-500/5 p-3 text-emerald-900">
                                    <p className="font-medium flex items-center gap-1.5">
                                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                                      <span>Payment Confirmed & Verified</span>
                                    </p>
                                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                                      Total paid: {formatNaira(order.totalAmount)} (Products: {formatNaira(order.subtotal)} + Shipping: {formatNaira(order.shippingFee || 0)}).
                                      {order.paymentReference ? ` Paystack Reference: ${order.paymentReference}.` : ''}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Items Breakdown */}
                          <div className="border border-[#0B0B0B]/10 bg-white p-4">
                            <p className="text-[11px] font-medium tracking-wider uppercase text-[#0B0B0B]/60 mb-3">
                              Order Items ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
                            </p>
                            <div className="divide-y divide-[#0B0B0B]/8 text-xs">
                              {order.items.map((item) => (
                                <div
                                  key={item.productId}
                                  className="flex items-center justify-between py-2.5"
                                >
                                  <div className="flex items-center gap-3">
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="h-10 w-10 object-cover border border-[#0B0B0B]/10"
                                        loading="lazy"
                                      />
                                    )}
                                    <div>
                                      <p className="font-medium text-[#0B0B0B]">
                                        {item.name}
                                      </p>
                                      <p className="text-[11px] text-[#0B0B0B]/55">
                                        {item.categoryLabel} · Qty: {item.quantity} × {formatNaira(item.price)}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="tabular-nums font-medium text-[#0B0B0B]">
                                    {formatNaira(item.price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
