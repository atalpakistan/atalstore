import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Banner } from '../types';

interface CarouselProps {
  banners: Banner[];
  onNavigateUrl: (url: string) => void;
}

export const Carousel: React.FC<CarouselProps> = ({ banners, onNavigateUrl }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeBanners = banners.filter((b) => b.is_active);

  // Auto advance slides every 5.5s
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length]);

  const handlePrev = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  // Mobile Swipe Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  if (!activeBanners || activeBanners.length === 0) return null;

  const current = activeBanners[currentIndex];

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl aspect-[16/8] sm:aspect-[21/9] max-h-[480px] bg-[#062819] cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner Images Layer */}
        {activeBanners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80';
              }}
            />

            {/* Measured Luxury Contrast Scrim */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#041a10]/90 via-[#062819]/60 to-transparent sm:w-2/3" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#041a10]/80 via-transparent to-transparent sm:hidden" />
          </div>
        ))}

        {/* Content Box */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end sm:justify-center p-6 sm:p-10 lg:p-14 max-w-xl text-white">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-300 mb-2">
            ATAL Exclusive
          </span>
          <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2 leading-tight">
            {current.title}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mb-5 line-clamp-2 max-w-md">
            {current.subtitle}
          </p>

          <div>
            <button
              onClick={() => onNavigateUrl(current.cta_url)}
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-amber-400 hover:bg-amber-300 text-[#093824] font-bold text-xs sm:text-sm rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>{current.cta_text || 'Explore Collection'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Manual Arrow Navigation Buttons */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/30 hover:bg-[#093824] text-white/90 hover:text-amber-300 backdrop-blur-md border border-white/10 transition shadow-lg"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/30 hover:bg-[#093824] text-white/90 hover:text-amber-300 backdrop-blur-md border border-white/10 transition shadow-lg"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Bullet Progress Indicators */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-3 right-4 sm:bottom-6 sm:right-8 z-30 flex items-center gap-2">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? 'w-6 h-2 bg-amber-400'
                    : 'w-2 h-2 bg-white/50 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
