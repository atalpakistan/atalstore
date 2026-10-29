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
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 bg-amber-50/50 sm:rounded-3xl border-y sm:border border-amber-200/60 my-4">
      {/* Section Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>Limited Time Offers</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Desktop Carousel Controls */}
        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs sm:text-sm font-semibold text-[#093824] hover:text-emerald-700 mr-2 transition"
            >
              View All Deals &rarr;
            </button>
          )}
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-[#093824] hover:text-white transition shadow-sm"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-[#093824] hover:text-white transition shadow-sm"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Swipeable Row on Mobile (with peek-ahead neighboring cards) */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 pt-1 snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[240px] sm:w-[270px] lg:w-[285px] flex-shrink-0 snap-start"
          >
            <ProductCard product={product} onSelectProduct={onSelectProduct} />
          </div>
        ))}
      </div>
    </section>
  );
};
