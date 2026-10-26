import React, { useState } from 'react';
import {
  Grid,
  Heart,
  Home,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User as UserIcon,
  X,
  ChevronDown,
} from 'lucide-react';
import { AppSection, OFFICIAL_CATEGORIES, User } from '../types';
import { isUserAdmin } from '../services/adminService';

interface NavbarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  onOpenSearch: () => void;
  onOpenCartDrawer: () => void;
  wishlistCount: number;
  cartCount: number;
  user: User | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  onNavigate,
  onOpenSearch,
  onOpenCartDrawer,
  wishlistCount,
  cartCount,
  user,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const isAdmin = isUserAdmin(user);

  const handleNav = (section: AppSection) => {
    onNavigate(section);
    setMobileMenuOpen(false);
    setCategoriesDropdownOpen(false);
  };

  return (
    <>
      {/* Top Navigation Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 border-b border-[#0B0B0B]/10 bg-[#F8F6EF]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single Text Element Brand Wordmark */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center text-[#0B0B0B] hover:text-[#701F36] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleNav('home')}
              className="font-display text-lg sm:text-xl font-semibold tracking-[0.22em] text-[#0B0B0B] hover:text-[#701F36] transition-colors whitespace-nowrap"
            >
              LUNA ROYALE
            </button>
          </div>

          {/* Zone 2: Clean Text Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-7 text-xs font-medium tracking-wider text-[#0B0B0B]/80"
          >
            <button
              type="button"
              onClick={() => handleNav('shop')}
              className={`py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                activeSection === 'shop'
                  ? 'border-b border-[#701F36] text-[#701F36]'
                  : ''
              }`}
            >
              Shop
            </button>

            <div
              className="relative"
              onMouseEnter={() => setCategoriesDropdownOpen(true)}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCategoriesDropdownOpen((prev) => !prev)}
                aria-expanded={categoriesDropdownOpen}
                className={`inline-flex items-center gap-1 py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                  ['jewelry', 'watches', 'eyewear', 'fragrance', 'royale-home'].includes(
                    activeSection
                  )
                    ? 'border-b border-[#701F36] text-[#701F36]'
                    : ''
                }`}
              >
                <span>Categories</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {categoriesDropdownOpen && (
                <div className="absolute top-full left-0 w-56 pt-2 z-50">
                  <div className="border border-[#0B0B0B]/12 bg-[#F8F6EF] py-2 shadow-sm">
                    {OFFICIAL_CATEGORIES.map((cat) => (
                      <button
                        key={cat.internalCategory}
                        type="button"
                        onClick={() => handleNav(cat.navSlug)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs text-[#0B0B0B]/85 hover:bg-[#0B0B0B]/[0.03] hover:text-[#701F36] transition-colors"
                      >
                        <span className="font-medium">{cat.customerLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleNav('jewelry')}
              className={`hidden xl:inline-block py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                activeSection === 'jewelry'
                  ? 'border-b border-[#701F36] text-[#701F36]'
                  : ''
              }`}
            >
              Jewelry
            </button>

            <button
              type="button"
              onClick={() => handleNav('watches')}
              className={`hidden xl:inline-block py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                activeSection === 'watches'
                  ? 'border-b border-[#701F36] text-[#701F36]'
                  : ''
              }`}
            >
              Watches
            </button>

            <button
              type="button"
              onClick={() => handleNav('collections')}
              className={`py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                activeSection === 'collections'
                  ? 'border-b border-[#701F36] text-[#701F36]'
                  : ''
              }`}
            >
              Collections
            </button>

            <button
              type="button"
              onClick={() => handleNav('gift-sets')}
              className={`py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                activeSection === 'gift-sets'
                  ? 'border-b border-[#701F36] text-[#701F36]'
                  : ''
              }`}
            >
              Gift Sets
            </button>

            <button
              type="button"
              onClick={() => handleNav('about')}
              className={`py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                activeSection === 'about'
                  ? 'border-b border-[#701F36] text-[#701F36]'
                  : ''
              }`}
            >
              About
            </button>

            <button
              type="button"
              onClick={() => handleNav('contact')}
              className={`py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                activeSection === 'contact'
                  ? 'border-b border-[#701F36] text-[#701F36]'
                  : ''
              }`}
            >
              Contact
            </button>

            <button
              type="button"
              onClick={() => handleNav('concierge')}
              className={`inline-flex items-center gap-1.5 py-1 whitespace-nowrap transition-colors hover:text-[#701F36] ${
                activeSection === 'concierge'
                  ? 'border-b border-[#701F36] text-[#701F36]'
                  : 'text-[#701F36]'
              }`}
            >
              <Sparkles className="h-3 w-3 text-[#D6B47A]" />
              <span>AI Concierge</span>
            </button>
          </nav>

          {/* Zone 3: Actions (Search, Wishlist, Cart, Account, Dynamic Admin) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNav('admin')}
                aria-label="Admin Dashboard"
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wider whitespace-nowrap transition-colors ${
                  activeSection === 'admin'
                    ? 'bg-[#701F36] text-[#F8F6EF]'
                    : 'border border-[#701F36]/40 text-[#701F36] hover:bg-[#701F36] hover:text-[#F8F6EF]'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Search products"
              className="flex h-10 w-10 items-center justify-center text-[#0B0B0B] hover:text-[#701F36] transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => handleNav('wishlist')}
              aria-label={`Wishlist (${wishlistCount} items)`}
              className="relative flex h-10 w-10 items-center justify-center text-[#0B0B0B] hover:text-[#701F36] transition-colors"
            >
              <Heart className="h-4 w-4" />
              {wishlistCount > 0 && (
                <span className="ml-1 text-[11px] font-medium tabular-nums text-[#701F36]">
                  {wishlistCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenCartDrawer}
              aria-label={`Shopping Cart (${cartCount} items)`}
              className="relative flex h-10 px-2 items-center justify-center text-[#0B0B0B] hover:text-[#701F36] transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="ml-1.5 text-xs font-medium tabular-nums text-[#0B0B0B]">
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('account')}
              aria-label="Account"
              className={`flex h-10 w-10 items-center justify-center transition-colors ${
                user ? 'text-[#701F36]' : 'text-[#0B0B0B] hover:text-[#701F36]'
              }`}
            >
              <UserIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Slide-Out Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden bg-[#0B0B0B]/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          <div className="flex h-full w-full max-w-xs flex-col justify-between bg-[#F8F6EF] border-r border-[#0B0B0B]/15 p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-[#0B0B0B]/10 pb-4">
                <span className="font-display text-base font-semibold tracking-[0.2em] text-[#0B0B0B]">
                  LUNA ROYALE
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex h-10 w-10 items-center justify-center text-[#0B0B0B]/70 hover:text-[#701F36]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-6 flex flex-col space-y-1">
                <button
                  type="button"
                  onClick={() => handleNav('home')}
                  className="py-2.5 text-left text-sm font-medium text-[#0B0B0B] hover:text-[#701F36]"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('shop')}
                  className="py-2.5 text-left text-sm font-medium text-[#0B0B0B] hover:text-[#701F36]"
                >
                  Shop All
                </button>

                <div className="pt-3 pb-1">
                  <p className="text-[11px] tracking-[0.16em] text-[#0B0B0B]/45 uppercase">
                    Categories
                  </p>
                </div>
                {OFFICIAL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.internalCategory}
                    type="button"
                    onClick={() => handleNav(cat.navSlug)}
                    className="py-2 pl-3 text-left text-sm text-[#0B0B0B]/85 hover:text-[#701F36]"
                  >
                    {cat.customerLabel}
                  </button>
                ))}

                <div className="pt-4 pb-1">
                  <p className="text-[11px] tracking-[0.16em] text-[#0B0B0B]/45 uppercase">
                    Curations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNav('collections')}
                  className="py-2 pl-3 text-left text-sm text-[#0B0B0B]/85 hover:text-[#701F36]"
                >
                  Collections
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('gift-sets')}
                  className="py-2 pl-3 text-left text-sm text-[#0B0B0B]/85 hover:text-[#701F36]"
                >
                  Gift Sets (Boxes & Sets)
                </button>

                <div className="pt-4 pb-1">
                  <p className="text-[11px] tracking-[0.16em] text-[#0B0B0B]/45 uppercase">
                    Client Services
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNav('orders')}
                  className="py-2 pl-3 text-left text-sm text-[#0B0B0B]/85 hover:text-[#701F36]"
                >
                  My Orders
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('delivery')}
                  className="py-2 pl-3 text-left text-sm text-[#0B0B0B]/85 hover:text-[#701F36]"
                >
                  Delivery Information
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('about')}
                  className="py-2 pl-3 text-left text-sm text-[#0B0B0B]/85 hover:text-[#701F36]"
                >
                  About LUNA ROYALE
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('contact')}
                  className="py-2 pl-3 text-left text-sm text-[#0B0B0B]/85 hover:text-[#701F36]"
                >
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('concierge')}
                  className="flex items-center gap-2 py-2 pl-3 text-left text-sm font-medium text-[#701F36] hover:text-[#0B0B0B]"
                >
                  <Sparkles className="h-4 w-4 text-[#D6B47A]" />
                  <span>AI Concierge</span>
                </button>

                {isAdmin && (
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => handleNav('admin')}
                      className="flex w-full items-center gap-2 bg-[#701F36] px-4 py-3 text-xs font-medium tracking-wider text-[#F8F6EF]"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </button>
                  </div>
                )}
              </nav>
            </div>

            <div className="mt-8 border-t border-[#0B0B0B]/10 pt-4">
              <p className="font-display text-xs italic text-[#0B0B0B]/65">
                Elegance, Curated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar — Home, Categories, Wishlist, Cart, Account */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed right-0 bottom-0 left-0 z-30 flex h-14 items-center justify-around border-t border-[#0B0B0B]/12 bg-[#F8F6EF]/95 backdrop-blur-sm lg:hidden"
      >
        <button
          type="button"
          onClick={() => handleNav('home')}
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
            activeSection === 'home' ? 'text-[#701F36]' : 'text-[#0B0B0B]/70'
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
            ['shop', 'jewelry', 'watches', 'eyewear', 'fragrance', 'royale-home'].includes(
              activeSection
            )
              ? 'text-[#701F36]'
              : 'text-[#0B0B0B]/70'
          }`}
        >
          <Grid className="h-4 w-4" />
          <span>Categories</span>
        </button>

        <button
          type="button"
          onClick={() => handleNav('wishlist')}
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
            activeSection === 'wishlist' ? 'text-[#701F36]' : 'text-[#0B0B0B]/70'
          }`}
        >
          <Heart className="h-4 w-4" />
          <span>Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => handleNav('cart')}
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
            activeSection === 'cart' ? 'text-[#701F36]' : 'text-[#0B0B0B]/70'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => handleNav('account')}
          className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
            activeSection === 'account' ? 'text-[#701F36]' : 'text-[#0B0B0B]/70'
          }`}
        >
          <UserIcon className="h-4 w-4" />
          <span>Account</span>
        </button>
      </nav>
    </>
  );
};
