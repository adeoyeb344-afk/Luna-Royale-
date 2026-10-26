import React, { useState } from 'react';

interface ProductMediaProps {
  src?: string | null;
  alt: string;
  categoryLabel?: string;
  aspectClassName?: string;
  className?: string;
}

/**
 * Reusable luxury media component prepared for real product photography / Cloudinary URLs.
 * Never uses stock photos or fake image URLs.
 * Provides an intentional, refined editorial monogram frame when no image is uploaded yet
 * or if an external image fails to load.
 */
export const ProductMedia: React.FC<ProductMediaProps> = ({
  src,
  alt,
  categoryLabel,
  aspectClassName = 'aspect-[3/4]',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const cleanSrc = typeof src === 'string' ? src.trim() : '';
  const showImage = Boolean(cleanSrc.length > 0 && !hasError);

  return (
    <div
      className={`relative overflow-hidden bg-[#F2EFE6] border border-[#0B0B0B]/8 ${aspectClassName} ${className}`}
    >
      {showImage ? (
        <img
          src={cleanSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover object-center transition-transform duration-200 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center select-none">
          <div className="mb-3 flex h-12 w-12 items-center justify-center border border-[#D6B47A]/50 text-[#701F36]">
            <span className="font-display text-sm tracking-[0.2em]">LR</span>
          </div>
          <p className="font-display text-xs tracking-[0.18em] text-[#0B0B0B]/70 uppercase">
            LUNA ROYALE
          </p>
          {categoryLabel && (
            <p className="mt-1 text-[11px] tracking-[0.12em] text-[#0B0B0B]/45">
              {categoryLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
