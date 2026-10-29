import React from 'react';
import { Heart, Star, Eye, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const inWishlist = isInWishlist(product.id);

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : ['/icon.svg'];
  const mainImage = images[0];

  const hasDiscount = product.original_price > product.sale_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.original_price - product.sale_price) / product.original_price) * 100)
    : 0;

  const isLowStock = product.available_stock > 0 && product.available_stock <= product.low_stock_threshold;
  const isOutOfStock = product.available_stock <= 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
      
      {/* Top Image Container */}
      <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onSelectProduct(product)}>
        <img
          src={mainImage}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Discount Badge */}
        {hasDiscount && discountPercent > 0 && (
          <div className="absolute top-2.5 left-2.5 bg-amber-500 text-slate-950 font-bold text-[10px] sm:text-xs px-2 py-0.5 rounded-md shadow-sm tracking-tight">
            {discountPercent}% OFF
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition shadow-sm ${
            inWishlist
              ? 'bg-rose-50 text-rose-500 border border-rose-200'
              : 'bg-white/85 text-slate-600 hover:text-rose-500 hover:bg-white'
          }`}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Hover Quick Action Strip */}
        <div className="absolute inset-x-2 bottom-2 hidden sm:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectProduct(product);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/95 text-slate-800 text-xs font-semibold rounded-lg shadow-md hover:bg-slate-50 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            Quick View
          </button>
          {!isOutOfStock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product, product.variants?.[0], 1);
              }}
              className="p-2 bg-[#093824] text-amber-300 rounded-lg shadow-md hover:bg-[#062819] transition"
              title="Add to Cart"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-1.5 cursor-pointer" onClick={() => onSelectProduct(product)}>
        <div>
          {/* Brand & Category */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-semibold tracking-wide uppercase text-emerald-800 truncate">
              {product.brand}
            </span>
            {product.category_name && (
              <span className="text-slate-400 truncate hidden xs:inline">
                {product.category_name}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3 className="font-medium text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-900 transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Price & Rating */}
        <div className="pt-1.5 border-t border-slate-100 flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm sm:text-base font-bold text-[#093824] tabular-nums">
              Rs. {product.sale_price.toLocaleString('en-PK')}
            </span>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through tabular-nums">
                Rs. {product.original_price.toLocaleString('en-PK')}
              </span>
            )}
          </div>

          {/* Rating & Stock Status */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            {product.reviews_count > 0 ? (
              <div className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="tabular-nums text-slate-700">{product.rating.toFixed(1)}</span>
                <span className="text-slate-400 text-[10px]">({product.reviews_count})</span>
              </div>
            ) : (
              <span className="text-slate-400 text-[10px]">Authentic Guaranteed</span>
            )}

            {isOutOfStock ? (
              <span className="text-red-600 font-semibold text-[10px]">Sold Out</span>
            ) : isLowStock ? (
              <span className="text-amber-600 font-medium text-[10px]">Only {product.available_stock} left</span>
            ) : (
              <span className="text-emerald-700 font-medium text-[10px]">In Stock</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
