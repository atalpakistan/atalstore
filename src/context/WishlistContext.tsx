import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: string[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('atal_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync with server if logged in
  useEffect(() => {
    async function loadWishlist() {
      if (!token || !user) return;
      try {
        const res = await fetch('/api/wishlist', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.product_ids)) {
            setWishlistIds(data.product_ids);
            localStorage.setItem('atal_wishlist', JSON.stringify(data.product_ids));
          }
        }
      } catch {
        // Fallback to local
      }
    }
    loadWishlist();
  }, [token, user]);

  const toggleWishlist = async (productId: string) => {
    const isCurrently = wishlistIds.includes(productId);
    const updated = isCurrently
      ? wishlistIds.filter((id) => id !== productId)
      : [...wishlistIds, productId];

    setWishlistIds(updated);
    try {
      localStorage.setItem('atal_wishlist', JSON.stringify(updated));
    } catch {}

    // Send to server if signed in
    if (token) {
      try {
        await fetch('/api/wishlist/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ product_id: productId })
        });
      } catch {
        // Ignored
      }
    }
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        isInWishlist,
        toggleWishlist,
        count: wishlistIds.length
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
};
