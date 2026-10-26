/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AppSection,
  Box,
  CartItem,
  Collection,
  OFFICIAL_BOXES,
  OFFICIAL_COLLECTIONS,
  Order,
  Product,
  User,
  WishlistItem,
} from './types';
import {
  broadcastAuthCompletion,
  completeIframeHandoffSignIn,
  ensureAuthRelayReady,
  formatFirebaseAuthError,
  initiateGoogleRedirectSignIn,
  isRunningInIframe,
  pollAndCompleteRedirectHandoff,
  resolveGoogleRedirectSignIn,
  subscribeToAuthAndProfile,
} from './services/authService';
import {
  subscribeToBoxes,
  subscribeToCollections,
  subscribeToProducts,
} from './services/productService';
import {
  clearGuestCart,
  loadGuestCart,
  mergeGuestCartOnSignIn,
  saveGuestCart,
  saveUserCart,
  subscribeToUserCart,
} from './services/cartService';
import {
  loadGuestWishlist,
  mergeGuestWishlistOnSignIn,
  saveGuestWishlist,
  saveUserWishlist,
  subscribeToUserWishlist,
} from './services/wishlistService';
import { subscribeToUserOrders } from './services/orderService';
import { getCustomerCategoryLabel } from './services/firestoreService';
import { getUserFriendlyErrorMessage } from './services/firebase';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { CartDrawer } from './components/CartDrawer';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { GiftSetsPage } from './pages/GiftSetsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { CartPage } from './pages/CartPage';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { AiConciergePage } from './pages/AiConciergePage';

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [previousSection, setPreviousSection] = useState<AppSection>('shop');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [redirectLoading, setRedirectLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  // Catalog Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>(
    OFFICIAL_COLLECTIONS
  );
  const [boxes, setBoxes] = useState<Box[]>(OFFICIAL_BOXES);

  // User Cart, Wishlist, and Orders State
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadGuestCart());
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() =>
    loadGuestWishlist()
  );
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Overlays
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // 1. Handle Google Redirect Result & Auth State Subscription
  useEffect(() => {
    let isMounted = true;

    const searchParams = new URLSearchParams(window.location.search);
    const redirectStage = searchParams.get('lr_google_redirect');
    const urlHandoffId = searchParams.get('lr_handoff');

    if (urlHandoffId) {
      try {
        sessionStorage.setItem('lr_google_handoff_id', urlHandoffId);
      } catch {
        // Ignore sessionStorage errors
      }
    }

    let storedHandoffId: string | null = urlHandoffId;
    if (!storedHandoffId) {
      try {
        storedHandoffId = sessionStorage.getItem('lr_google_handoff_id');
      } catch {
        storedHandoffId = null;
      }
    }

    const hasPaystackCallback =
      searchParams.has('lr_paystack_ref') ||
      searchParams.has('reference') ||
      searchParams.has('trxref');
    if (hasPaystackCallback) {
      setActiveSection('cart');
    }

    ensureAuthRelayReady().catch(() => {});

    if (redirectStage === 'start' && !isRunningInIframe()) {
      setActiveSection('account');
      setRedirectLoading(true);
      const returnParams = new URLSearchParams();
      returnParams.set('lr_google_redirect', 'return');
      if (storedHandoffId) {
        returnParams.set('lr_handoff', storedHandoffId);
      }
      const returnUrl = `${window.location.pathname}?${returnParams.toString()}`;
      window.history.replaceState({}, document.title, returnUrl);

      initiateGoogleRedirectSignIn(storedHandoffId || undefined).catch((err) => {
        if (isMounted) {
          setRedirectError(formatFirebaseAuthError(err));
          setRedirectLoading(false);
        }
      });
    } else {
      if (redirectStage === 'return') {
        setActiveSection('account');
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      resolveGoogleRedirectSignIn(storedHandoffId)
        .then(async (resolvedUser) => {
          let finalUser = resolvedUser;
          if (!finalUser && redirectStage === 'return' && storedHandoffId) {
            finalUser = await pollAndCompleteRedirectHandoff(storedHandoffId);
          }
          if (finalUser && storedHandoffId) {
            try {
              sessionStorage.removeItem('lr_google_handoff_id');
            } catch {
              // Ignore
            }
          }
        })
        .catch((err) => {
          if (isMounted) {
            setRedirectError(formatFirebaseAuthError(err));
          }
        })
        .finally(() => {
          if (isMounted) {
            setRedirectLoading(false);
          }
        });
    }

    const handleCrossWindowAuth = (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const payload = data as {
        type?: string;
        idToken?: string | null;
        accessToken?: string | null;
      };
      if (
        payload.type === 'LUNA_ROYALE_AUTH_SUCCESS' &&
        (payload.idToken || payload.accessToken)
      ) {
        completeIframeHandoffSignIn(payload.idToken, payload.accessToken).catch(
          () => {}
        );
      }
    };

    const onWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      handleCrossWindowAuth(event.data);
    };
    window.addEventListener('message', onWindowMessage);

    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('luna_royale_auth_channel');
        channel.onmessage = (event) => handleCrossWindowAuth(event.data);
      }
    } catch {
      channel = null;
    }

    const unsubscribeAuth = subscribeToAuthAndProfile((authUser, ready) => {
      if (!isMounted) return;
      setUser(authUser);
      setIsAuthReady(ready);
      if (authUser && redirectStage === 'return') {
        broadcastAuthCompletion({ handoffId: storedHandoffId });
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('message', onWindowMessage);
      if (channel) {
        try {
          channel.close();
        } catch {
          // Ignore
        }
      }
      unsubscribeAuth();
    };
  }, []);

  // 2. Subscribe to Firestore Products, Collections, and Boxes
  useEffect(() => {
    setIsLoadingProducts(true);
    const unsubProducts = subscribeToProducts(
      (loadedProducts) => {
        setProducts(loadedProducts);
        setIsLoadingProducts(false);
        setProductsError(null);
      },
      (err) => {
        setIsLoadingProducts(false);
        setProductsError(
          getUserFriendlyErrorMessage(
            err,
            'Unable to load catalog at this moment.'
          )
        );
      }
    );

    const unsubCollections = subscribeToCollections((loadedCollections) => {
      setCollections(loadedCollections);
    });

    const unsubBoxes = subscribeToBoxes((loadedBoxes) => {
      setBoxes(loadedBoxes);
    });

    return () => {
      unsubProducts();
      unsubCollections();
      unsubBoxes();
    };
  }, []);

  // 3. Subscribe to Authenticated User's Cart, Wishlist, and Orders
  useEffect(() => {
    if (!isAuthReady) return;

    if (!user) {
      setCartItems(loadGuestCart());
      setWishlistItems(loadGuestWishlist());
      setUserOrders([]);
      setOrdersLoading(false);
      return;
    }

    const uid = user.uid;
    mergeGuestCartOnSignIn(uid);
    mergeGuestWishlistOnSignIn(uid);

    setOrdersLoading(true);
    const unsubCart = subscribeToUserCart(uid, (items) => {
      setCartItems(items);
    });

    const unsubWishlist = subscribeToUserWishlist(uid, (items) => {
      setWishlistItems(items);
    });

    const unsubOrders = subscribeToUserOrders(
      uid,
      (orders) => {
        setUserOrders(orders);
        setOrdersLoading(false);
      },
      () => {
        setOrdersLoading(false);
      }
    );

    return () => {
      unsubCart();
      unsubWishlist();
      unsubOrders();
    };
  }, [user, isAuthReady]);

  const wishlistIds = useMemo(
    () => new Set(wishlistItems.map((w) => w.productId)),
    [wishlistItems]
  );

  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const persistCart = (nextItems: CartItem[]) => {
    setCartItems(nextItems);
    if (user) {
      saveUserCart(user.uid, nextItems).catch(() => {
        saveGuestCart(nextItems);
      });
    } else {
      saveGuestCart(nextItems);
    }
  };

  const persistWishlist = (nextItems: WishlistItem[]) => {
    setWishlistItems(nextItems);
    if (user) {
      saveUserWishlist(user.uid, nextItems).catch(() => {
        saveGuestWishlist(nextItems);
      });
    } else {
      saveGuestWishlist(nextItems);
    }
  };

  const handleAddToCartWithQuantity = (product: Product, quantity: number) => {
    if (product.availability === 'out_of_stock') return;
    const cleanQty = Math.max(1, Math.min(99, Math.floor(quantity)));
    const existingIndex = cartItems.findIndex(
      (i) => i.productId === product.id
    );

    let next: CartItem[];
    if (existingIndex >= 0) {
      next = cartItems.map((item, idx) =>
        idx === existingIndex
          ? { ...item, quantity: Math.min(99, item.quantity + cleanQty) }
          : item
      );
    } else {
      next = [
        ...cartItems,
        {
          productId: product.id,
          itemType: 'product',
          name: product.name,
          categoryLabel: getCustomerCategoryLabel(product.category),
          price: product.price,
          currency: 'NGN',
          quantity: cleanQty,
          image: product.images[0] || null,
        },
      ];
    }

    persistCart(next);
    setCartDrawerOpen(true);
  };

  const handleAddToCart = (product: Product) => {
    handleAddToCartWithQuantity(product, 1);
  };

  const handleAddBoxToCart = (boxItem: CartItem) => {
    const existingIndex = cartItems.findIndex(
      (i) => i.productId === boxItem.productId
    );
    let next: CartItem[];
    if (existingIndex >= 0) {
      next = cartItems.map((item, idx) =>
        idx === existingIndex
          ? { ...item, quantity: Math.min(99, item.quantity + 1) }
          : item
      );
    } else {
      next = [...cartItems, boxItem];
    }
    persistCart(next);
    setCartDrawerOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    const next = cartItems.map((item) =>
      item.productId === productId
        ? { ...item, quantity: Math.min(99, Math.floor(newQty)) }
        : item
    );
    persistCart(next);
  };

  const handleRemoveCartItem = (productId: string) => {
    const next = cartItems.filter((item) => item.productId !== productId);
    persistCart(next);
  };

  const handleClearCart = () => {
    setCartItems([]);
    if (user) {
      saveUserCart(user.uid, []).catch(() => {});
    }
    clearGuestCart();
  };

  const handleToggleWishlist = (productId: string) => {
    const exists = wishlistItems.some((w) => w.productId === productId);
    const next = exists
      ? wishlistItems.filter((w) => w.productId !== productId)
      : [
          ...wishlistItems,
          { productId, addedAt: new Date().toISOString() },
        ];
    persistWishlist(next);
  };

  const handleNavigate = (section: AppSection) => {
    if (section !== 'product-detail') {
      setPreviousSection(section);
    }
    if (section !== 'collections') {
      setSelectedCollectionId(null);
    }
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    if (activeSection !== 'product-detail') {
      setPreviousSection(activeSection);
    }
    setActiveSection('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCollection = (collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
    setActiveSection('collections');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedProduct = useMemo(
    () =>
      selectedProductId
        ? products.find((p) => p.id === selectedProductId) || null
        : null,
    [products, selectedProductId]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6EF] text-[#0B0B0B]">
      <Navbar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenCartDrawer={() => setCartDrawerOpen(true)}
        wishlistCount={wishlistItems.length}
        cartCount={totalCartCount}
        user={user}
      />

      <main className="flex-1">
        {activeSection === 'home' && (
          <HomePage
            products={products}
            collections={collections}
            boxes={boxes}
            isLoadingProducts={isLoadingProducts}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleSelectProduct}
            onNavigate={handleNavigate}
            onSelectCollection={(colId) => handleSelectCollection(colId)}
          />
        )}

        {(activeSection === 'shop' ||
          activeSection === 'jewelry' ||
          activeSection === 'watches' ||
          activeSection === 'eyewear' ||
          activeSection === 'fragrance' ||
          activeSection === 'royale-home') && (
          <ShopPage
            activeSection={activeSection}
            products={products}
            collections={collections}
            isLoading={isLoadingProducts}
            error={productsError}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleSelectProduct}
            onNavigate={handleNavigate}
          />
        )}

        {activeSection === 'collections' && (
          <CollectionsPage
            collections={collections}
            products={products}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={handleSelectCollection}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {activeSection === 'gift-sets' && (
          <GiftSetsPage
            boxes={boxes}
            products={products}
            onAddBoxToCart={handleAddBoxToCart}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {activeSection === 'product-detail' && (
          <ProductDetailPage
            product={selectedProduct}
            user={user}
            userOrders={userOrders}
            isWishlisted={
              selectedProduct ? wishlistIds.has(selectedProduct.id) : false
            }
            onToggleWishlist={handleToggleWishlist}
            onAddToCartWithQuantity={handleAddToCartWithQuantity}
            onBack={() => handleNavigate(previousSection || 'shop')}
          />
        )}

        {activeSection === 'wishlist' && (
          <WishlistPage
            products={products}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleSelectProduct}
            onNavigate={handleNavigate}
          />
        )}

        {activeSection === 'cart' && (
          <CartPage
            items={cartItems}
            user={user}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onNavigate={handleNavigate}
          />
        )}

        {(activeSection === 'account' ||
          activeSection === 'orders' ||
          activeSection === 'delivery') && (
          <AccountPage
            user={user}
            isAuthReady={isAuthReady}
            redirectLoading={redirectLoading}
            redirectError={redirectError}
            userOrders={userOrders}
            ordersLoading={ordersLoading}
            initialTab={
              activeSection === 'orders'
                ? 'orders'
                : activeSection === 'delivery'
                  ? 'delivery'
                  : 'profile'
            }
            wishlistCount={wishlistItems.length}
            cartCount={totalCartCount}
            onNavigate={handleNavigate}
          />
        )}

        {activeSection === 'admin' && (
          <AdminDashboardPage
            user={user}
            products={products}
            collections={collections}
            boxes={boxes}
          />
        )}

        {activeSection === 'about' && (
          <AboutPage onNavigate={handleNavigate} />
        )}

        {activeSection === 'contact' && <ContactPage />}

        {activeSection === 'concierge' && (
          <AiConciergePage
            products={products}
            isLoadingProducts={isLoadingProducts}
            user={user}
            wishlistItems={wishlistItems}
            cartItems={cartItems}
            userOrders={userOrders}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleSelectProduct}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      <Footer
        onNavigate={handleNavigate}
        onSelectCollection={(colId) => handleSelectCollection(colId)}
      />

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
        onSelectProduct={handleSelectProduct}
      />

      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
