import React from 'react';
import { Home, LayoutGrid, ShoppingBag, PackageCheck, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  currentTab: 'home' | 'categories' | 'orders' | 'account' | 'admin';
  onSelectTab: (tab: 'home' | 'categories' | 'orders' | 'account') => void;
  onOpenCategoriesModal?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { itemCount, openCart } = useCart();
  const { user, openAuthModal } = useAuth();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 safe-area-pb">
      <div className="grid grid-cols-5 items-center justify-items-center">
        
        {/* Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            currentTab === 'home' ? 'text-[#093824] font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Home"
        >
          <Home className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* Categories */}
        <button
          onClick={() => onSelectTab('categories')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            currentTab === 'categories' ? 'text-[#093824] font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Categories"
        >
          <LayoutGrid className={`w-5 h-5 ${currentTab === 'categories' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight">Categories</span>
        </button>

        {/* Cart */}
        <button
          onClick={openCart}
          className="relative flex flex-col items-center gap-1 py-1 px-2 text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Shopping Cart"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-400 text-[#093824] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Cart</span>
        </button>

        {/* My Orders */}
        <button
          onClick={() => onSelectTab('orders')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            currentTab === 'orders' ? 'text-[#093824] font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="My Orders"
        >
          <PackageCheck className={`w-5 h-5 ${currentTab === 'orders' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight whitespace-nowrap">My Orders</span>
        </button>

        {/* Account */}
        <button
          onClick={() => {
            if (!user) {
              openAuthModal('login');
            } else {
              onSelectTab('account');
            }
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
            currentTab === 'account' ? 'text-[#093824] font-semibold' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Account"
        >
          <User className={`w-5 h-5 ${currentTab === 'account' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight truncate max-w-[50px]">
            {user ? 'Account' : 'Sign In'}
          </span>
        </button>

      </div>
    </div>
  );
};
