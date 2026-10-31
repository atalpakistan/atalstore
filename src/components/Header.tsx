import React, { useState } from 'react';
import { Search, Heart, ShoppingBag, User as UserIcon, Shield, Menu, X, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { StoreSettings } from '../types';

interface HeaderProps {
  settings?: StoreSettings | null;
  onOpenSearch: () => void;
  onNavigateHome: () => void;
  onNavigateCategory: (slug: string) => void;
  onNavigateAdmin: () => void;
  onNavigateOrders: () => void;
  onOpenTracking: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSearch,
  onNavigateHome,
  onNavigateCategory,
  onNavigateAdmin,
  onNavigateOrders,
  onOpenTracking
}) => {
  const { itemCount, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, isAdmin, openAuthModal, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  const announcementText = settings?.announcement_bar_text || '🇵🇰 Free Nationwide Delivery on orders above Rs. 9,999 | Rs. 290 Delivery Fee | 100% Genuine Guaranteed';
  const logoUrl = settings?.header_logo_url || '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg';

  return (
    <header className="sticky top-0 z-40 w-full shadow-md header-container mobile-friendly-header">
      {/* Top Announcement Bar */}
      {showAnnouncement && settings?.announcement_bar_enabled !== false && (
        <div className="bg-[#052215] text-amber-200 text-xs py-1.5 px-4 flex items-center justify-between border-b border-emerald-900/50">
          <div className="flex-1 text-center font-medium truncate flex items-center justify-center gap-2">
            <Truck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{announcementText}</span>
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="text-amber-200/70 hover:text-amber-100 p-0.5 ml-2 shrink-0"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Dark Green Navigation Bar */}
      <div className="bg-[#093824] text-white border-b border-[#0f4d33]">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-16 sm:h-20 flex flex-nowrap items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Mobile Menu Trigger & Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-3 -ml-2 text-white/90 hover:text-amber-300 rounded-lg hover:bg-emerald-900/40 transition"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo and Brand Name */}
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <img
                src={logoUrl}
                alt="ATAL Logo"
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow rounded-md"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl sm:text-2xl tracking-wider text-amber-300 group-hover:text-amber-200 transition-colors">
                  ATAL
                </span>
                <span className="text-[10px] text-emerald-200 tracking-wider uppercase font-medium hidden sm:block">
                  {settings?.tagline || 'Smart Shop. Live Better'}
                </span>
              </div>
            </button>
          </div>

          {/* Center: Search Bar Affordance */}
          <div className="flex-1 max-w-md mx-2 sm:mx-6 hidden sm:block">
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between bg-emerald-950/70 border border-emerald-800/80 rounded-full px-4 py-2 text-xs sm:text-sm text-emerald-200 hover:text-white hover:border-amber-400/60 transition shadow-inner"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Search Pakistani kurtas, electronics, perfumes...</span>
              </span>
              <kbd className="hidden lg:inline-block bg-emerald-900/80 text-amber-200 text-[10px] px-2 py-0.5 rounded font-mono border border-emerald-700/50">
                Search
              </kbd>
            </button>
          </div>

          {/* Right Action Icons: Search (mobile), Wishlist, Cart, User */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Mobile Search Icon */}
            <button
              onClick={onOpenSearch}
              className="sm:hidden p-3 -mr-2 text-white/90 hover:text-amber-300 rounded-lg transition"
              aria-label="Search products"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Icon */}
            <button
              onClick={onNavigateHome}
              className="relative p-2 text-white/90 hover:text-amber-300 rounded-lg hover:bg-emerald-900/40 transition"
              title="My Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 bg-amber-400 text-[#093824] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={openCart}
              className="relative flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 bg-amber-400 text-[#093824] font-semibold text-xs sm:text-sm rounded-full hover:bg-amber-300 transition shadow-md"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums font-bold">
                {itemCount}
              </span>
              <span className="hidden md:inline text-xs ml-0.5">Cart</span>
            </button>

            {/* Customer Account / Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('login');
                  } else {
                    setShowUserMenu(!showUserMenu);
                  }
                }}
                className="flex items-center gap-1.5 p-2 text-white/90 hover:text-amber-300 rounded-lg hover:bg-emerald-900/40 transition"
                aria-label="Account"
              >
                <UserIcon className="w-5 h-5" />
                {user && (
                  <span className="hidden xl:inline text-xs font-medium max-w-[80px] truncate text-emerald-100">
                    {user.full_name.split(' ')[0]}
                  </span>
                )}
              </button>

              {/* User Dropdown Menu */}
              {user && showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-500">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-emerald-700 truncate">{user.email}</p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigateAdmin();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-emerald-800 font-semibold hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Admin Dashboard
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigateOrders();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>My Orders</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenTracking();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>Track Order</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Category Subheader on Desktop */}
      <nav className="hidden md:block bg-[#062819] border-b border-emerald-950 text-emerald-100/90 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-10">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigateCategory('men')}
              className="hover:text-amber-300 font-medium transition whitespace-nowrap"
            >
              Men's Fashion
            </button>
            <button
              onClick={() => onNavigateCategory('women')}
              className="hover:text-amber-300 font-medium transition whitespace-nowrap"
            >
              Women's Pret & Lawn
            </button>
            <button
              onClick={() => onNavigateCategory('kids')}
              className="hover:text-amber-300 font-medium transition whitespace-nowrap"
            >
              Kids & Toys
            </button>
            <button
              onClick={() => onNavigateCategory('cosmetics-perfume')}
              className="hover:text-amber-300 font-medium transition whitespace-nowrap"
            >
              Cosmetics & Luxury Oud
            </button>
            <button
              onClick={() => onNavigateCategory('electronics')}
              className="hover:text-amber-300 font-medium transition whitespace-nowrap"
            >
              Audio & Electronics
            </button>
          </div>

          <div className="flex items-center gap-4 text-emerald-300/80 text-[11px]">
            <button onClick={onOpenTracking} className="hover:text-amber-300 transition font-semibold">
              🚚 Track Order
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#062819] border-b border-emerald-900 text-white px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
          <p className="text-[11px] font-semibold text-amber-300 tracking-wider uppercase">Shop Categories</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigateCategory('men');
              }}
              className="text-left py-2 px-3 bg-emerald-950/60 rounded-lg text-emerald-100 hover:text-amber-300"
            >
              Men
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigateCategory('women');
              }}
              className="text-left py-2 px-3 bg-emerald-950/60 rounded-lg text-emerald-100 hover:text-amber-300"
            >
              Women
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigateCategory('kids');
              }}
              className="text-left py-2 px-3 bg-emerald-950/60 rounded-lg text-emerald-100 hover:text-amber-300"
            >
              Kids
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigateCategory('cosmetics-perfume');
              }}
              className="text-left py-2 px-3 bg-emerald-950/60 rounded-lg text-emerald-100 hover:text-amber-300"
            >
              Cosmetics & Perfume
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigateCategory('electronics');
              }}
              className="text-left py-2 px-3 bg-emerald-950/60 rounded-lg text-emerald-100 hover:text-amber-300 col-span-2"
            >
              Electronics & Gadgets
            </button>
          </div>

          <div className="border-t border-emerald-900/60 pt-3 flex flex-col gap-2 text-xs text-emerald-200">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenTracking();
              }}
              className="text-left py-1 hover:text-amber-300 font-semibold"
            >
              🚚 Track Pakistani Order
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
