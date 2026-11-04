import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface FestiveDealsSectionProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  onSelectProduct: (product: Product) => void;
  onViewAll?: () => void;
}

export const FestiveDealsSection: React.FC<FestiveDealsSectionProps> = ({
  products,
  title = '⚡ Featured Festive Deals',
  subtitle = 'Exclusive limited-time savings across Pakistan',
  onSelectProduct,
  onViewAll,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollAmount = clientWidth * 0.75;
    scrollRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-red-50/90 via-amber-50/40 to-red-50/90 sm:rounded-2xl border-y sm:border border-red-200/80 my-3 shadow-xs">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="flex items-center gap-1 text-amber-700 text-[11px] font-bold uppercase tracking-wider mb-0.5">
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Limited Time Offers</span>
          </div>
          <h2 className="font-display text-base sm:text-lg lg:text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Desktop Carousel Controls */}
        <div className="flex items-center gap-1.5">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-bold text-[#093824] hover:text-emerald-700 mr-2 transition"
            >
              View All &rarr;
            </button>
          )}
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-[#093824] hover:text-white transition shadow-xs"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-[#093824] hover:text-white transition shadow-xs"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Swipeable Row on Mobile (Compact sleek card sizing) */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4.5 overflow-x-auto no-scrollbar pb-2 pt-0.5 snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[185px] sm:w-[210px] lg:w-[225px] flex-shrink-0 snap-start"
          >
            <ProductCard product={product} onSelectProduct={onSelectProduct} />
          </div>
        ))}
      </div>
    </section>
  );
};
