import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, ProductVariant, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  reconcileProducts: (freshProducts: Product[]) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('atal_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const freeShippingThreshold = 9999; // in PKR

  useEffect(() => {
    try {
      localStorage.setItem('atal_cart', JSON.stringify(items));
    } catch {
      // Storage quota or disabled
    }
  }, [items]);

  const addToCart = (product: Product, variant?: ProductVariant, quantity: number = 1) => {
    const unitPrice = variant?.price || product.sale_price;
    const itemId = `${product.id}_${variant?.id || 'std'}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === itemId);
      if (existingIndex > -1) {
        const next = [...prev];
        const existing = next[existingIndex];
        const newQty = existing.quantity + quantity;
        next[existingIndex] = {
          ...existing,
          quantity: newQty,
          total_price: unitPrice * newQty,
        };
        return next;
      } else {
        const newItem: CartItem = {
          id: itemId,
          product_id: product.id,
          product,
          variant_id: variant?.id,
          variant,
          quantity,
          unit_price: unitPrice,
          total_price: unitPrice * quantity,
        };
        return [...prev, newItem];
      }
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          return {
            ...i,
            quantity,
            total_price: i.unit_price * quantity,
          };
        }
        return i;
      })
    );
  };

  const reconcileProducts = useCallback((freshProducts: Product[]) => {
    if (!Array.isArray(freshProducts) || freshProducts.length === 0) return;
    const byId = new Map<string, Product>();
    for (const p of freshProducts) {
      if (p?.id) byId.set(p.id, p);
    }

    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const pid = item.product_id || item.product?.id;
        if (!pid) return item;
        const fresh = byId.get(pid);
        if (!fresh) return item;

        const freshVariant = item.variant_id && Array.isArray(fresh.variants)
          ? fresh.variants.find((v) => v.id === item.variant_id) || item.variant
          : undefined;
        const freshUnitPrice = Number(freshVariant?.price ?? fresh.sale_price ?? item.unit_price);
        const qty = Math.max(1, Number(item.quantity || 1));
        const freshTotalPrice = freshUnitPrice * qty;

        const priceChanged = freshUnitPrice !== item.unit_price || freshTotalPrice !== item.total_price;
        const stockChanged =
          fresh.available_stock !== item.product?.available_stock ||
          (freshVariant && freshVariant.stock !== item.variant?.stock);

        if (!priceChanged && !stockChanged) return item;

        changed = true;
        return {
          ...item,
          product: fresh,
          variant: freshVariant ?? item.variant,
          unit_price: freshUnitPrice,
          total_price: freshTotalPrice,
        };
      });

      return changed ? next : prev;
    });
  }, []);

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = Number(item.total_price) || ((Number(item.unit_price) || 0) * (Number(item.quantity) || 1));
    return sum + itemTotal;
  }, 0);
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        reconcileProducts,
        clearCart,
        itemCount,
        subtotal,
        freeShippingThreshold,
        amountToFreeShipping,
        isCartOpen,
        setIsCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
