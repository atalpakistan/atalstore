import React, { useEffect, useState } from 'react';

export const DEFAULT_ATAL_LOGO_URL = '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg';

interface AnimatedLogoProps {
  logoUrl?: string | null;
  variant?: 'header' | 'loader';
  alt?: string;
  className?: string;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  logoUrl,
  variant = 'header',
  alt = 'ATAL Logo',
  className,
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = logoUrl || DEFAULT_ATAL_LOGO_URL;

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  const isLoader = variant === 'loader';
  const sizeClasses =
    className ||
    (isLoader
      ? 'w-20 h-20 sm:w-24 sm:h-24 rounded-xl'
      : 'w-9 h-9 sm:w-11 sm:h-11 rounded-md');

  if (hasError) {
    return null;
  }

  return (
    <span className="atal-logo-wrap shrink-0">
      <span
        aria-hidden="true"
        className={`atal-logo-glow ${isLoader ? 'atal-logo-glow--loader' : ''}`}
      />
      <img
        src={resolvedSrc}
        alt={alt}
        width={isLoader ? 96 : 44}
        height={isLoader ? 96 : 44}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        referrerPolicy="no-referrer"
        className={`atal-logo-img object-contain drop-shadow ${sizeClasses}`}
        onError={() => setHasError(true)}
      />
    </span>
  );
};
