import React from 'react';
import { AppSection, OFFICIAL_CATEGORIES, OFFICIAL_COLLECTIONS } from '../types';

interface AboutPageProps {
  onNavigate: (section: AppSection) => void;
}

/**
 * About LUNA ROYALE Page
 * Strictly adheres to Section 29:
 * Does NOT invent founder name, founder biography, company history, founding date,
 * location, awards, certifications, brand achievements, or press mentions.
 */
export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="border-b border-[#0B0B0B]/12 pb-10">
        <p className="text-xs tracking-[0.2em] text-[#701F36] uppercase">
          The House
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-5xl font-normal tracking-[0.12em] text-[#0B0B0B]">
          About LUNA ROYALE
        </h1>
        <p className="mt-3 font-display text-lg sm:text-xl italic text-[#701F36]">
          Elegance, Curated.
        </p>
      </div>

      {/* Brand Aesthetic & Inclusive Curation */}
      <section className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
            Curation Philosophy
          </h2>
          <p className="mt-2 text-xs text-[#0B0B0B]/60">
            Timeless style and careful selection.
          </p>
        </div>
        <div className="lg:col-span-7 space-y-4 text-sm leading-relaxed text-[#0B0B0B]/80">
          <p>
            LUNA ROYALE is a luxury fashion and lifestyle house dedicated to careful curation, enduring style, and refined presentation across personal adornment and ambient fragrance.
          </p>
          <p>
            Designed to be welcoming and inclusive across women, men, girls, boys, children, and adults, the house brings together five core pillars: Jewelry, Watches, Eyewear, Fragrance, and Royale Home.
          </p>
        </div>
      </section>

      {/* Official House Pillars */}
      <section className="mt-16 border-t border-[#0B0B0B]/12 pt-12">
        <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
          Official Categories & Collections
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 p-6">
            <h3 className="font-display text-xs font-semibold tracking-[0.18em] text-[#701F36] uppercase">
              Product Categories
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#0B0B0B]/80">
              {OFFICIAL_CATEGORIES.map((cat, i) => (
                <li key={cat.internalCategory} className="flex items-center justify-between">
                  <span>
                    0{i + 1}. {cat.customerLabel}
                  </span>
                  <span className="text-[#0B0B0B]/50">{cat.internalCategory}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/50 p-6">
            <h3 className="font-display text-xs font-semibold tracking-[0.18em] text-[#701F36] uppercase">
              Signature Collections
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs text-[#0B0B0B]/80">
              {OFFICIAL_COLLECTIONS.map((col) => (
                <li key={col.id} className="flex items-center justify-between gap-2">
                  <span className="font-medium">{col.name}</span>
                  <span className="text-[#0B0B0B]/55 text-right">{col.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Authentic LUNA ROYALE Brand Story */}
      <section className="mt-16 border-t border-[#0B0B0B]/12 pt-12">
        <div className="max-w-3xl">
          <p className="font-sans text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
            Brand Evolution
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-[0.14em] text-[#0B0B0B] uppercase">
            A NEW CHAPTER
          </h2>

          <p className="mt-4 font-display text-base sm:text-lg italic text-[#701F36]">
            Some stories don't end. They evolve.
          </p>

          <div className="mt-6 space-y-4 font-sans text-sm sm:text-base leading-relaxed text-[#0B0B0B]/80">
            <p>
              LUNA ROYALE began with a simple vision — to bring beauty, elegance and confidence into the everyday.
            </p>
            <p>
              Our journey began as Lumora Essence. Along the way, you watched us grow, supported us, and became part of our story. As that vision grew, so did the brand.
            </p>
            <p className="font-medium text-[#0B0B0B]">
              Today, we're stepping into a new chapter.
            </p>
            <p className="font-display text-base tracking-wider text-[#701F36]">
              Lumora Essence is becoming LUNA ROYALE.
            </p>
            <p className="italic text-[#0B0B0B]/90">
              A new name. A refined identity. A bigger vision.
            </p>
            <p>
              LUNA ROYALE represents elegance, individuality and the beauty of becoming more. Jewelry, watches, eyewear and fragrances remain part of our story, while our vision continues to grow into something more intentional — from the pieces we curate to the experience that comes with every piece.
            </p>
            <p>
              This isn't the end of Lumora Essence.
            </p>
            <p className="font-medium text-[#0B0B0B]">
              It's the evolution of everything we've built together.
            </p>
            <p>
              To everyone who has been part of the journey, thank you for growing with us.
            </p>
            <p>
              And now, welcome to the next chapter.
            </p>
            <div className="pt-2">
              <p className="font-display text-lg tracking-wider text-[#0B0B0B]">
                Welcome to LUNA ROYALE.
              </p>
              <p className="font-display text-sm italic text-[#701F36]">
                Elegance, Curated.
              </p>
            </div>
          </div>
        </div>

        {/* The Luna Royale Vision */}
        <div className="mt-14 max-w-3xl border-t border-[#0B0B0B]/10 pt-10">
          <p className="font-sans text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
            Core Identity
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-[0.14em] text-[#0B0B0B] uppercase">
            THE LUNA ROYALE VISION
          </h2>

          <div className="mt-6 space-y-4 font-sans text-sm sm:text-base leading-relaxed text-[#0B0B0B]/80">
            <p>
              LUNA ROYALE is a curated luxury accessories and fragrance brand created for people who appreciate elegance, beauty and timeless details.
            </p>
            <p>
              The goal isn't to sell everything.
            </p>
            <p className="font-medium text-[#0B0B0B]">
              The goal is to make everyday luxury feel accessible, intentional and memorable.
            </p>

            <div className="mt-8 space-y-3 border-l-2 border-[#701F36]/40 pl-5 text-sm">
              <p>
                <strong className="font-display tracking-wider text-[#0B0B0B]">Luna</strong> represents the moon — elegance, beauty and quiet presence.
              </p>
              <p>
                <strong className="font-display tracking-wider text-[#0B0B0B]">Royale</strong> represents refinement, confidence and a distinctive experience.
              </p>
            </div>

            <p className="pt-3 font-medium text-[#0B0B0B]">
              Together, LUNA ROYALE represents a vision of modern elegance, thoughtfully curated.
            </p>
          </div>

          <div className="mt-10">
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="inline-flex items-center gap-3 bg-[#701F36] px-8 py-4 text-xs font-sans font-medium tracking-[0.18em] text-[#F8F6EF] uppercase hover:bg-[#0B0B0B] transition-colors duration-150"
            >
              <span>Explore the Catalog</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
