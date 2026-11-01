import React, { useState, useEffect } from 'react';
import { X, Heart, Trash2, ShoppingBag, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Product } from '../types';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const { wishlistIds, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (wishlistIds.length === 0) {
      setProducts([]);
      return;
    }

    async function loadWishlistProducts() {
      setLoading(true);
      try {
        const res = await fetch('/api/wishlist/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_ids: wishlistIds }),
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch {
        // Fallback: search individual products if batch fails
      } finally {
        setLoading(false);
      }
    }

    loadWishlistProducts();
  }, [isOpen, wishlistIds]);

  if (!isOpen) return null;

  const handleAddToCart = (product: Product) => {
    addToCart(product, product.variants?.[0], 1);
    setAddedItemIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  const handleAddAllToCart = () => {
    products.forEach((p) => {
      if ((p.available_stock ?? 1) > 0) {
        addToCart(p, p.variants?.[0], 1);
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#093824] text-white flex items-center justify-between border-b border-emerald-950">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="font-display text-lg font-bold">My Saved Wishlist</h2>
            <span className="text-xs bg-amber-400 text-[#093824] font-bold px-2 py-0.5 rounded-full tabular-nums">
              {wishlistIds.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-emerald-900 rounded-lg transition"
            aria-label="Close wishlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#093824] mb-3" />
              <p className="text-xs font-semibold">Loading saved products...</p>
            </div>
          ) : wishlistIds.length === 0 || products.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-800 mb-1">Your wishlist is empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-6">
                Tap the heart icon on any kurta, perfume, or electronic item to save it for later.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#093824] text-amber-300 font-bold text-xs rounded-xl hover:bg-[#062819] transition shadow"
              >
                Explore Collections
              </button>
            </div>
          ) : (
            products.map((product) => {
              const mainImage = Array.isArray(product.images) && product.images[0] ? product.images[0] : '/icon.svg';
              const isOutOfStock = (product.available_stock ?? 1) <= 0;
              const isAdded = addedItemIds[product.id];

              return (
                <div
                  key={product.id}
                  className="flex gap-3.5 pb-4 border-b border-slate-100 last:border-b-0 items-start"
                >
                  {/* Product Thumbnail */}
                  <div
                    onClick={() => {
                      onClose();
                      onSelectProduct(product);
                    }}
                    className="w-18 h-22 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/70 cursor-pointer"
                  >
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icon.svg';
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        {product.brand || 'ATAL'}
                      </span>
                      <h4
                        onClick={() => {
                          onClose();
                          onSelectProduct(product);
                        }}
                        className="font-medium text-xs sm:text-sm text-slate-900 truncate cursor-pointer hover:text-[#093824] transition-colors"
                      >
                        {product.name}
                      </h4>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-bold text-sm text-[#093824] tabular-nums">
                          Rs. {product.sale_price.toLocaleString('en-PK')}
                        </span>
                        {product.original_price > product.sale_price && (
                          <span className="text-xs text-slate-400 line-through tabular-nums">
                            Rs. {product.original_price.toLocaleString('en-PK')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(product)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg shadow-sm transition ${
                          isAdded
                            ? 'bg-emerald-700 text-white'
                            : isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-[#093824] hover:bg-[#062819] text-amber-300'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added to Cart!</span>
                          </>
                        ) : isOutOfStock ? (
                          <span>Out of Stock</span>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {products.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-2">
            <button
              onClick={handleAddAllToCart}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs sm:text-sm rounded-xl shadow transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add All Available Items to Cart</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
