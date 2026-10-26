import React from 'react';
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.46 6.27 6.27 0 0 0 1.94-4.48V8.41a8.28 8.28 0 0 0 5.16 1.83V6.79a4.85 4.85 0 0 1-1.37-.1z" />
  </svg>
);

export const ContactPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 text-[#0B0B0B]">
      <div className="border-b border-[#0B0B0B]/12 pb-10">
        <p className="font-sans text-xs tracking-[0.2em] text-[#701F36] uppercase font-medium">
          Client Concierge
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-5xl font-normal tracking-[0.1em] text-[#0B0B0B]">
          Contact LUNA ROYALE
        </h1>
        <p className="mt-3 max-w-xl font-sans text-sm text-[#0B0B0B]/70">
          Official communication channels and client care directory for LUNA ROYALE.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Direct Contact Information Structure */}
        <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/60 p-8">
          <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
            Direct Concierge Details
          </h2>
          <p className="mt-2 font-sans text-xs leading-relaxed text-[#0B0B0B]/65">
            For inquiries regarding curated pieces, bespoke packaging, or client services.
          </p>

          <dl className="mt-6 divide-y divide-[#0B0B0B]/10 font-sans text-xs">
            {/* Email */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <dt className="flex items-center gap-2.5 font-medium text-[#0B0B0B]/75">
                <Mail className="h-4 w-4 text-[#701F36] shrink-0" />
                <span>Email</span>
              </dt>
              <dd>
                <a
                  href="mailto:Adeoyeb344@gmail.com"
                  className="font-medium text-[#0B0B0B] hover:text-[#701F36] transition-colors underline-offset-4 hover:underline"
                >
                  Adeoyeb344@gmail.com
                </a>
              </dd>
            </div>

            {/* Telephone / Concierge */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <dt className="flex items-center gap-2.5 font-medium text-[#0B0B0B]/75">
                <Phone className="h-4 w-4 text-[#701F36] shrink-0" />
                <span>Telephone / Concierge</span>
              </dt>
              <dd>
                <a
                  href="tel:+2348066483640"
                  className="font-medium tabular-nums text-[#0B0B0B] hover:text-[#701F36] transition-colors underline-offset-4 hover:underline"
                >
                  +2348066483640
                </a>
              </dd>
            </div>

            {/* WhatsApp Concierge */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <dt className="flex items-center gap-2.5 font-medium text-[#0B0B0B]/75">
                <MessageCircle className="h-4 w-4 text-[#701F36] shrink-0" />
                <span>WhatsApp Concierge</span>
              </dt>
              <dd>
                <a
                  href="https://wa.me/2349075130157"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium tabular-nums text-[#0B0B0B] hover:text-[#701F36] transition-colors underline-offset-4 hover:underline"
                >
                  +2349075130157
                </a>
              </dd>
            </div>

            {/* Physical Location */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <dt className="flex items-center gap-2.5 font-medium text-[#0B0B0B]/75 shrink-0">
                <MapPin className="h-4 w-4 text-[#701F36] shrink-0" />
                <span>Physical Location</span>
              </dt>
              <dd className="text-right sm:max-w-xs text-[#0B0B0B]/70 leading-relaxed">
                LUNA ROYALE currently operates without a physical retail store.
              </dd>
            </div>
          </dl>
        </div>

        {/* Online Presence Structure */}
        <div className="border border-[#0B0B0B]/12 bg-[#F4F1E8]/60 p-8 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg tracking-wider text-[#0B0B0B]">
              Social & Digital Channels
            </h2>
            <p className="mt-2 font-sans text-xs leading-relaxed text-[#0B0B0B]/65">
              Connect with our official channels for releases, collections, and house updates.
            </p>

            <ul className="mt-6 space-y-4 font-sans text-xs">
              {/* Instagram */}
              <li className="border-b border-[#0B0B0B]/10 pb-4">
                <a
                  href="https://www.instagram.com/luna_royale33/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[#0B0B0B]/75 hover:text-[#701F36] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Instagram className="h-4 w-4 text-[#701F36] group-hover:text-[#0B0B0B] transition-colors shrink-0" />
                    <div>
                      <p className="font-medium text-[#0B0B0B]">Instagram</p>
                      <p className="text-[11px] text-[#0B0B0B]/60">@luna_royale33</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium tracking-wider text-[#701F36] group-hover:text-[#0B0B0B] transition-colors uppercase">
                    Visit Profile →
                  </span>
                </a>
              </li>

              {/* TikTok */}
              <li className="border-b border-[#0B0B0B]/10 pb-4">
                <a
                  href="https://www.tiktok.com/@lunaroyale33"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[#0B0B0B]/75 hover:text-[#701F36] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TikTokIcon className="h-4 w-4 text-[#701F36] group-hover:text-[#0B0B0B] transition-colors shrink-0" />
                    <div>
                      <p className="font-medium text-[#0B0B0B]">TikTok</p>
                      <p className="text-[11px] text-[#0B0B0B]/60">@lunaroyale33</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium tracking-wider text-[#701F36] group-hover:text-[#0B0B0B] transition-colors uppercase">
                    Visit Profile →
                  </span>
                </a>
              </li>

              {/* Facebook */}
              <li className="pb-1">
                <a
                  href="https://www.facebook.com/profile.php?id=61591792687322"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[#0B0B0B]/75 hover:text-[#701F36] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Facebook className="h-4 w-4 text-[#701F36] group-hover:text-[#0B0B0B] transition-colors shrink-0" />
                    <div>
                      <p className="font-medium text-[#0B0B0B]">Facebook</p>
                      <p className="text-[11px] text-[#0B0B0B]/60">Ibukunoluwa Adeoye</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium tracking-wider text-[#701F36] group-hover:text-[#0B0B0B] transition-colors uppercase">
                    Visit Profile →
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <div className="mt-8 border-t border-[#0B0B0B]/10 pt-4">
            <p className="font-display text-xs italic tracking-wider text-[#701F36]">
              LUNA ROYALE — Elegance, Curated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
