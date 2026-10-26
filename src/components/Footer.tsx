import React from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { AppSection, OFFICIAL_CATEGORIES, OFFICIAL_COLLECTIONS } from '../types';

const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.46 6.27 6.27 0 0 0 1.94-4.48V8.41a8.28 8.28 0 0 0 5.16 1.83V6.79a4.85 4.85 0 0 1-1.37-.1z" />
  </svg>
);

interface FooterProps {
  onNavigate: (section: AppSection) => void;
  onSelectCollection: (collectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onSelectCollection,
}) => {
  return (
    <footer className="border-t border-[#0B0B0B]/12 bg-[#F8F6EF] pb-20 lg:pb-12 pt-16 text-[#0B0B0B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand Identity */}
          <div>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="font-display text-xl font-semibold tracking-[0.22em] text-[#0B0B0B] hover:text-[#701F36] transition-colors"
            >
              LUNA ROYALE
            </button>
            <p className="mt-2 font-display text-sm italic tracking-wide text-[#701F36]">
              Elegance, Curated.
            </p>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-[#0B0B0B]/65">
              Curated luxury jewelry, timepieces, eyewear, signature fragrance, Royale Home, and gift sets.
            </p>
          </div>

          {/* Column 2: Categories */}
          <div>
            <h3 className="font-display text-xs font-semibold tracking-[0.18em] text-[#0B0B0B] uppercase">
              Categories
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#0B0B0B]/75">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  Shop All
                </button>
              </li>
              {OFFICIAL_CATEGORIES.map((cat) => (
                <li key={cat.internalCategory}>
                  <button
                    type="button"
                    onClick={() => onNavigate(cat.navSlug)}
                    className="hover:text-[#701F36] transition-colors"
                  >
                    {cat.customerLabel}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('gift-sets')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  Gift Sets
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Official Collections */}
          <div>
            <h3 className="font-display text-xs font-semibold tracking-[0.18em] text-[#0B0B0B] uppercase">
              Collections
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#0B0B0B]/75">
              {OFFICIAL_COLLECTIONS.map((col) => (
                <li key={col.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCollection(col.id)}
                    className="text-left hover:text-[#701F36] transition-colors"
                  >
                    {col.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Client Services & Official Channels */}
          <div>
            <h3 className="font-display text-xs font-semibold tracking-[0.18em] text-[#0B0B0B] uppercase">
              Client Services
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#0B0B0B]/75">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  Account
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('orders')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  My Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('delivery')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  Delivery Information
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('wishlist')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  Wishlist
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('concierge')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  AI Concierge
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  About LUNA ROYALE
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#701F36] transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>

            <div className="mt-8 border-t border-[#0B0B0B]/10 pt-5">
              <h4 className="font-display text-xs font-semibold tracking-[0.18em] text-[#0B0B0B] uppercase">
                Social Channels
              </h4>
              <ul className="mt-3.5 space-y-2.5 font-sans text-xs">
                <li>
                  <a
                    href="https://www.instagram.com/luna_royale33/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 text-[#0B0B0B]/75 hover:text-[#701F36] transition-colors"
                  >
                    <Instagram className="h-3.5 w-3.5 text-[#701F36] group-hover:text-[#0B0B0B] transition-colors shrink-0" />
                    <span>Instagram: <span className="text-[#0B0B0B] group-hover:text-[#701F36]">@luna_royale33</span></span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.tiktok.com/@lunaroyale33"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 text-[#0B0B0B]/75 hover:text-[#701F36] transition-colors"
                  >
                    <TikTokIcon className="h-3.5 w-3.5 text-[#701F36] group-hover:text-[#0B0B0B] transition-colors shrink-0" />
                    <span>TikTok: <span className="text-[#0B0B0B] group-hover:text-[#701F36]">@lunaroyale33</span></span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/profile.php?id=61591792687322"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2.5 text-[#0B0B0B]/75 hover:text-[#701F36] transition-colors"
                  >
                    <Facebook className="h-3.5 w-3.5 text-[#701F36] group-hover:text-[#0B0B0B] transition-colors shrink-0" />
                    <span>Facebook: <span className="text-[#0B0B0B] group-hover:text-[#701F36]">Ibukunoluwa Adeoye</span></span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#0B0B0B]/10 pt-8 text-xs text-[#0B0B0B]/55 sm:flex-row">
          <p>© {new Date().getFullYear()} LUNA ROYALE. All rights reserved.</p>
          <p className="font-display tracking-widest text-[#0B0B0B]/70">
            LUNA ROYALE — Elegance, Curated.
          </p>
        </div>
      </div>
    </footer>
  );
};
