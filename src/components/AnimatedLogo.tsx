import React, { useEffect, useState } from 'react';

export const DEFAULT_ATAL_LOGO_URL = '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg';

interface AnimatedLogoProps {
  logoUrl?: string | null;
  alt?: string;
  className?: string;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  logoUrl,
  alt = 'ATAL Logo',
  className = 'w-9 h-9 sm:w-11 sm:h-11 rounded-md',
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = logoUrl || DEFAULT_ATAL_LOGO_URL;

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (hasError) {
    return null;
  }

  return (
    <span className="atal-logo-wrap shrink-0">
      <span aria-hidden="true" className="atal-logo-glow" />
      <img
        src={resolvedSrc}
        alt={alt}
        width={44}
        height={44}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        referrerPolicy="no-referrer"
        className={`atal-logo-img object-contain drop-shadow ${className}`}
        onError={() => setHasError(true)}
      />
    </span>
  );
};
