import React from 'react';
import { X, ShoppingBag, Trash2, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CartDrawerProps {
  onProceedCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedCheckout }) => {
  const {
    items,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    subtotal,
    freeShippingThreshold,
    amountToFreeShipping,
  } = useCart();

  if (!isCartOpen) return null;

  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-[#093824] text-white flex items-center justify-between border-b border-emerald-950">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold">Shopping Bag</h2>
            <span className="text-xs bg-amber-400 text-[#093824] font-bold px-2 py-0.5 rounded-full tabular-nums">
              {items.length}
            </span>
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 text-white/80 hover:text-white hover:bg-emerald-900 rounded-lg transition"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Ribbon */}
        <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-100 text-xs">
          <div className="flex items-center justify-between font-medium text-emerald-900 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-700" />
              {amountToFreeShipping > 0 ? (
                <span>
                  Add <strong className="text-emerald-950 font-bold tabular-nums">Rs. {amountToFreeShipping.toLocaleString('en-PK')}</strong> for <strong>Free Delivery</strong>
                </span>
              ) : (
                <span className="text-emerald-800 font-bold">🎉 You qualify for FREE Nationwide Delivery!</span>
              )}
            </span>
            <span className="font-bold tabular-nums">{progressPercent}%</span>
          </div>
          <div className="w-full bg-emerald-200/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#093824] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800 mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-800 mb-1">Your bag is empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mb-6">
                Explore our festive kurtas, earbuds, perfumes, and premium collection.
              </p>
              <button
                onClick={closeCart}
                className="px-6 py-2.5 bg-[#093824] text-amber-300 font-bold text-xs rounded-xl hover:bg-[#062819] transition shadow"
              >
                Start Browsing
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3.5 pb-4 border-b border-slate-100 last:border-b-0"
              >
                {/* Product Thumbnail */}
                <div className="w-18 h-22 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/70">
                  <img
                    src={item.variant?.image_url || item.product.images?.[0] || '/icon.svg'}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      {item.product.brand}
                    </span>
                    <h4 className="font-medium text-xs sm:text-sm text-slate-900 truncate">
                      {item.product.name}
                    </h4>
                    {item.variant && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.variant.color_name} {item.variant.size && `· ${item.variant.size}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-sm text-[#093824] tabular-nums">
                      Rs. {(Number(item.total_price) || ((Number(item.unit_price) || Number(item.product?.sale_price) || 0) * (Number(item.quantity) || 1))).toLocaleString('en-PK')}
                    </span>

                    {/* Quantity Steppers & Delete */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-bold text-slate-800 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Summary */}
        {items.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-bold text-slate-900 tabular-nums">
                Rs. {subtotal.toLocaleString('en-PK')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span>Shipping Fee</span>
              <span className="font-medium text-emerald-800">
                {subtotal >= freeShippingThreshold ? 'FREE' : 'Rs. 290 (Calculated at checkout)'}
              </span>
            </div>

            <button
              onClick={() => {
                closeCart();
                onProceedCheckout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-sm rounded-xl shadow-lg transition"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
