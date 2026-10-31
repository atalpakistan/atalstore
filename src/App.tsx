import React, { useState, useEffect } from 'react';
import { safeFetchJson } from './utils/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ErrorBoundary } from './components/ErrorBoundary';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { Carousel } from './components/Carousel';
import { CategoryRow } from './components/CategoryRow';
import { FestiveDealsSection } from './components/FestiveDealsSection';
import { SpotlightSection } from './components/SpotlightSection';
import { CatalogGridSection } from './components/CatalogGridSection';
import { NewLaunchSection } from './components/NewLaunchSection';
import { LaunchSoonSection } from './components/LaunchSoonSection';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CheckoutPage } from './components/CheckoutPage';
import { OrderSuccessPage } from './components/OrderSuccessPage';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { PWAInstallButton } from './components/PWAInstallButton';

import { Product, ProductVariant, HomepagePayload, StoreSettings } from './types';
import { Loader2 } from 'lucide-react';

function StorefrontApp() {
  const { user, isAdmin, openAuthModal } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();

  // Navigation State
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [mobileTab, setMobileTab] = useState<'home' | 'categories' | 'orders' | 'account' | 'admin'>('home');

  // Homepage Payload from Server
  const [homepageData, setHomepageData] = useState<HomepagePayload | null>(null);
  const [loadingHomepage, setLoadingHomepage] = useState(true);

  // Selected Filter Category Slug
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  // Handle browser back / forward navigation and Android gestures
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path.startsWith('/category/')) {
        setSelectedCategorySlug(path.replace('/category/', ''));
      } else if (path === '/') {
        setSelectedCategorySlug(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Initialize category slug if starting on /category/:slug
    if (window.location.pathname.startsWith('/category/')) {
      setSelectedCategorySlug(window.location.pathname.replace('/category/', ''));
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch Homepage Data
  const fetchHomepage = async () => {
    try {
      const { ok, data } = await safeFetchJson<HomepagePayload>('/api/homepage');
      if (ok && data) {
        setHomepageData(data);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingHomepage(false);
    }
  };

  useEffect(() => {
    fetchHomepage();
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({ path }, '', path);
      setCurrentPath(path);
      if (path.startsWith('/category/')) {
        setSelectedCategorySlug(path.replace('/category/', ''));
      } else if (path === '/') {
        setSelectedCategorySlug(null);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackNavigation = (fallbackPath: string = '/') => {
    if (window.history.length > 1 && window.history.state !== null) {
      window.history.back();
    } else {
      navigateTo(fallbackPath);
    }
  };

  // Route parsing
  const isProductRoute = currentPath.startsWith('/product/');
  const productSlug = isProductRoute ? currentPath.replace('/product/', '') : null;

  const isCheckoutRoute = currentPath === '/checkout';
  const isOrderSuccessRoute = currentPath.startsWith('/order-success/');
  const orderSuccessId = isOrderSuccessRoute ? currentPath.replace('/order-success/', '').split('?')[0] : null;

  const isAdminRoute = currentPath === '/admin';

  // Handle Buy Now
  const handleBuyNow = (product: Product, variant?: ProductVariant, quantity = 1) => {
    addToCart(product, variant, quantity);
    navigateTo('/checkout');
  };

  // Section visibility helpers based on admin settings
  const isSectionEnabled = (key: string): boolean => {
    if (!homepageData?.sections) return true;
    const sec = homepageData.sections.find((s) => s.section_key === key);
    return sec ? Boolean(sec.is_enabled) : true;
  };

  const getSectionTitle = (key: string, fallback: string): string => {
    if (!homepageData?.sections) return fallback;
    const sec = homepageData.sections.find((s) => s.section_key === key);
    return sec?.title || fallback;
  };

  const getSectionSubtitle = (key: string, fallback: string): string => {
    if (!homepageData?.sections) return fallback;
    const sec = homepageData.sections.find((s) => s.section_key === key);
    return sec?.subtitle || fallback;
  };

  // If Admin route requested, verify permission or show sign-in
  if (isAdminRoute) {
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
            <h2 className="font-display text-xl font-bold text-slate-900">
              Administrator Access Required
            </h2>
            <p className="text-xs text-slate-500">
              The ATAL STORE administrative dashboard is restricted to authorized personnel.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => handleBackNavigation('/')}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Back to Store
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 bg-[#093824] text-amber-300 text-xs font-bold rounded-xl"
              >
                Sign In as Admin
              </button>
            </div>
          </div>
          <AuthModal />
        </div>
      );
    }
    return (
      <AdminDashboard
        onBackToStore={() => handleBackNavigation('/')}
        onNavigateProduct={(slug) => navigateTo(`/product/${slug}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-[#093824] selection:text-amber-200">
      
      {/* Global Header */}
      <Header
        settings={homepageData?.settings}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNavigateHome={() => {
          setSelectedCategorySlug(null);
          setMobileTab('home');
          navigateTo('/');
        }}
        onNavigateCategory={(slug) => {
          setSelectedCategorySlug(slug);
          navigateTo(`/category/${slug}`);
          setTimeout(() => {
            document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
        onNavigateAdmin={() => navigateTo('/admin')}
        onNavigateOrders={() => {
          if (!user) openAuthModal('login');
          else setIsTrackingOpen(true);
        }}
        onOpenTracking={() => setIsTrackingOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isProductRoute && productSlug ? (
          <ProductDetailPage
            productSlugOrId={productSlug}
            onBack={() => handleBackNavigation(selectedCategorySlug ? `/category/${selectedCategorySlug}` : '/')}
            onNavigateProduct={(slug) => navigateTo(`/product/${slug}`)}
            onBuyNow={handleBuyNow}
          />
        ) : isCheckoutRoute ? (
          <CheckoutPage
            settings={homepageData?.settings}
            onBack={() => handleBackNavigation('/')}
            onOrderSuccess={(orderId) => navigateTo(`/order-success/${orderId}`)}
          />
        ) : isOrderSuccessRoute && orderSuccessId ? (
          <OrderSuccessPage
            orderId={orderSuccessId}
            onNavigateHome={() => navigateTo('/')}
            onNavigateTrack={() => setIsTrackingOpen(true)}
          />
        ) : (
          /* HOMEPAGE IN EXACT SPECIFIED SECTION ORDER */
          <div>
            {loadingHomepage ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-[#093824] mb-3" />
                <p className="text-xs font-semibold">ATAL STORE — Smart Shop. Live Better...</p>
              </div>
            ) : (
              <>
                {/* SECTION 1: PROMOTIONAL CAROUSEL */}
                {isSectionEnabled('carousel') && (
                  <Carousel
                    banners={homepageData?.banners || []}
                    onNavigateUrl={(url) => {
                      if (url.startsWith('/category/')) {
                        const slug = url.replace('/category/', '');
                        setSelectedCategorySlug(slug);
                        setTimeout(() => {
                          document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      } else {
                        navigateTo(url);
                      }
                    }}
                  />
                )}

                {/* SECTION 2: SHOP BY CATEGORY (5 MAIN CATEGORIES IN ONE ROW ON MOBILE) */}
                {isSectionEnabled('categories') && (
                  <CategoryRow
                    categories={homepageData?.categories || []}
                    selectedCategorySlug={selectedCategorySlug}
                    onSelectCategory={(slug) => {
                      setSelectedCategorySlug(slug === selectedCategorySlug ? null : slug);
                      setTimeout(() => {
                        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                  />
                )}

                {/* SECTION 3: FEATURED FESTIVE DEALS */}
                {isSectionEnabled('festive_deals') && (
                  <FestiveDealsSection
                    products={homepageData?.festive_deals || []}
                    title={getSectionTitle('festive_deals', '⚡ Featured Festive Deals')}
                    subtitle={getSectionSubtitle('festive_deals', 'Exclusive limited-time savings across Pakistan')}
                    onSelectProduct={(p) => navigateTo(`/product/${p.slug}`)}
                    onViewAll={() => {
                      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                )}

                {/* SECTION 4: SPOTLIGHT PRODUCTS */}
                {isSectionEnabled('spotlight') && (
                  <SpotlightSection
                    products={homepageData?.spotlight_products || []}
                    title={getSectionTitle('spotlight', 'Spotlight Products')}
                    subtitle={getSectionSubtitle('spotlight', 'Exquisite Pakistani craftsmanship and flagship electronics')}
                    onSelectProduct={(p) => navigateTo(`/product/${p.slug}`)}
                  />
                )}

                {/* SECTION 5: ALL PRODUCT CATALOG */}
                {isSectionEnabled('all_products') && (
                  <CatalogGridSection
                    categories={homepageData?.categories || []}
                    initialCategorySlug={selectedCategorySlug}
                    onSelectProduct={(p) => navigateTo(`/product/${p.slug}`)}
                  />
                )}

                {/* SECTION 6: NEW LAUNCH */}
                {isSectionEnabled('new_launch') && (
                  <NewLaunchSection
                    products={homepageData?.new_launches || []}
                    title={getSectionTitle('new_launch', 'New Launch')}
                    subtitle={getSectionSubtitle('new_launch', 'Freshly introduced collections and cutting-edge arrivals')}
                    onSelectProduct={(p) => navigateTo(`/product/${p.slug}`)}
                  />
                )}

                {/* SECTION 7: LAUNCH SOON */}
                {isSectionEnabled('launch_soon') && (
                  <LaunchSoonSection
                    items={homepageData?.launch_soon || []}
                    title={getSectionTitle('launch_soon', 'Launch Soon')}
                    subtitle={getSectionSubtitle('launch_soon', 'Upcoming releases and limited capsule drops. Register for priority notification.')}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Global Footer */}
      {!isAdminRoute && (
        <Footer
          settings={homepageData?.settings}
          onNavigateCategory={(slug) => {
            setSelectedCategorySlug(slug);
            navigateTo('/');
            setTimeout(() => {
              document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          onOpenTracking={() => setIsTrackingOpen(true)}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      {!isAdminRoute && (
        <BottomNav
          currentTab={mobileTab}
          onSelectTab={(tab) => {
            setMobileTab(tab);
            if (tab === 'home') {
              setSelectedCategorySlug(null);
              navigateTo('/');
            } else if (tab === 'categories') {
              navigateTo('/');
              setTimeout(() => {
                document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            } else if (tab === 'orders') {
              setIsTrackingOpen(true);
            } else if (tab === 'account') {
              if (!user) openAuthModal('login');
              else setIsTrackingOpen(true);
            }
          }}
        />
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer onProceedCheckout={() => navigateTo('/checkout')} />

      {/* Instant Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(p) => navigateTo(`/product/${p.slug}`)}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
      />

      {/* Customer & Admin Authentication Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <ErrorBoundary>
            <StorefrontApp />
          </ErrorBoundary>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
