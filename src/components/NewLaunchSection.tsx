import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface NewLaunchSectionProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  onSelectProduct: (product: Product) => void;
}

export const NewLaunchSection: React.FC<NewLaunchSectionProps> = ({
  products,
  title = 'New Launch',
  subtitle = 'Freshly introduced collections and cutting-edge arrivals',
  onSelectProduct,
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
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>Just Arrived</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Desktop Controls */}
        <div className="flex items-center gap-2">
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

      {/* Horizontal Swipeable Row */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 pt-1 snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[230px] sm:w-[260px] lg:w-[275px] flex-shrink-0 snap-start"
          >
            <ProductCard product={product} onSelectProduct={onSelectProduct} />
          </div>
        ))}
      </div>
    </section>
  );
};
