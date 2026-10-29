import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { Product } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

interface SpotlightSectionProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  onSelectProduct: (product: Product) => void;
}

export const SpotlightSection: React.FC<SpotlightSectionProps> = ({
  products,
  title = 'Spotlight Products',
  subtitle = 'Exquisite Pakistani craftsmanship and flagship electronics',
  onSelectProduct,
}) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (!products || products.length === 0) return null;

  const primarySpotlight = products[0];
  const secondarySpotlights = products.slice(1, 4);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Curator's Showcase</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Hero Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Dominant Feature Box */}
        {primarySpotlight && (
          <div className="lg:col-span-7 bg-gradient-to-br from-[#062819] via-[#093824] to-[#041a10] text-white rounded-3xl p-6 sm:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-semibold backdrop-blur-md mb-4 border border-amber-400/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Featured Flagship
              </div>
              <p className="text-xs text-emerald-300 uppercase font-semibold tracking-wider mb-1">
                {primarySpotlight.brand}
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
                {primarySpotlight.name}
              </h3>
              <p className="text-sm text-emerald-100/90 line-clamp-3 mb-6 max-w-md">
                {primarySpotlight.short_description}
              </p>
            </div>

            {/* Featured Image & CTA */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center mt-4 pt-6 border-t border-emerald-800/60">
              <div
                className="aspect-square rounded-2xl overflow-hidden bg-white/10 p-2 cursor-pointer"
                onClick={() => onSelectProduct(primarySpotlight)}
              >
                <img
                  src={primarySpotlight.images?.[0] || '/icon.svg'}
                  alt={primarySpotlight.name}
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="flex flex-col justify-center gap-4">
                <div>
                  <span className="text-xs text-emerald-200 block">Offer Price</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-amber-300 tabular-nums">
                      Rs. {primarySpotlight.sale_price.toLocaleString('en-PK')}
                    </span>
                    {primarySpotlight.original_price > primarySpotlight.sale_price && (
                      <span className="text-sm text-emerald-200/60 line-through tabular-nums">
                        Rs. {primarySpotlight.original_price.toLocaleString('en-PK')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => onSelectProduct(primarySpotlight)}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-[#093824] font-bold text-xs sm:text-sm rounded-xl shadow-lg transition"
                  >
                    <span>View Specifications</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => addToCart(primarySpotlight, primarySpotlight.variants?.[0], 1)}
                    className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm rounded-xl backdrop-blur-md transition border border-white/10"
                  >
                    Quick Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Secondary Spotlight Column */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {secondarySpotlights.map((item) => {
            const inWish = isInWishlist(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onSelectProduct(item)}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-4 hover:shadow-lg transition-all duration-300 cursor-pointer group"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={item.images?.[0] || '/icon.svg'}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {item.brand}
                  </span>
                  <h4 className="font-medium text-sm text-slate-900 group-hover:text-emerald-900 transition-colors line-clamp-1 mb-1">
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                    {item.short_description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#093824] tabular-nums">
                      Rs. {item.sale_price.toLocaleString('en-PK')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                      aria-label="Wishlist"
                    >
                      <Heart className={`w-4 h-4 ${inWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
