import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
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
import { FloatingWhatsApp } from './components/FloatingWhatsApp';

import {
  createHistoryKey,
  fetchHomepageWithCache,
  getCachedHomepage,
  getScrollPosition,
  invalidateAllStoreCache,
  saveScrollPosition,
} from './utils/pageCache';
import { Product, ProductVariant, HomepagePayload } from './types';
import { Loader2 } from 'lucide-react';

const ProductDetailPage = lazy(() =>
  import('./components/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const CheckoutPage = lazy(() =>
  import('./components/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const OrderSuccessPage = lazy(() =>
  import('./components/OrderSuccessPage').then((m) => ({ default: m.OrderSuccessPage }))
);
const CartDrawer = lazy(() =>
  import('./components/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);
const WishlistDrawer = lazy(() =>
  import('./components/WishlistDrawer').then((m) => ({ default: m.WishlistDrawer }))
);
const SearchModal = lazy(() =>
  import('./components/SearchModal').then((m) => ({ default: m.SearchModal }))
);
const OrderTrackingModal = lazy(() =>
  import('./components/OrderTrackingModal').then((m) => ({ default: m.OrderTrackingModal }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const CustomerDashboard = lazy(() =>
  import('./components/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard }))
);

const DEFAULT_DOCUMENT_TITLE = 'ATAL — Smart Shop. Live Better';

const RouteFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center py-20 text-slate-400">
    <Loader2 className="w-8 h-8 animate-spin text-[#093824] mb-3" />
    <p className="text-xs font-medium">Loading...</p>
  </div>
);

function StorefrontApp() {
  const { user, isAdmin, openAuthModal } = useAuth();
  const { addToCart } = useCart();

  // Navigation & History Scroll Restoration State
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [mobileTab, setMobileTab] = useState<'home' | 'categories' | 'orders' | 'account' | 'admin'>('home');
  const currentHistoryKeyRef = useRef<string>(
    (window.history.state && typeof window.history.state.historyKey === 'string'
      ? window.history.state.historyKey
      : '') || createHistoryKey()
  );

  // Homepage Payload from Cache / Server
  const initialCachedHomepage = getCachedHomepage();
  const [homepageData, setHomepageData] = useState<HomepagePayload | null>(() => initialCachedHomepage.data);
  const [loadingHomepage, setLoadingHomepage] = useState<boolean>(() => !initialCachedHomepage.data);

  // Selected Filter Category Slug
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(() =>
    window.location.pathname.startsWith('/category/')
      ? window.location.pathname.replace('/category/', '')
      : null
  );

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Route parsing
  const isProductRoute = currentPath.startsWith('/product/');
  const productSlug = isProductRoute ? currentPath.replace('/product/', '') : null;

  const isCheckoutRoute = currentPath === '/checkout';
  const isOrderSuccessRoute = currentPath.startsWith('/order-success/');
  const orderSuccessId = isOrderSuccessRoute ? currentPath.replace('/order-success/', '').split('?')[0] : null;

  const isDashboardRoute = currentPath === '/dashboard' || currentPath === '/orders' || currentPath === '/account';
  const isAdminRoute = currentPath === '/admin';
  const isHomepageRoute = !isProductRoute && !isCheckoutRoute && !isOrderSuccessRoute && !isDashboardRoute && !isAdminRoute;

  const [hasInitializedHomepage, setHasInitializedHomepage] = useState<boolean>(() => isHomepageRoute);
  useEffect(() => {
    if (isHomepageRoute && !hasInitializedHomepage) {
      setHasInitializedHomepage(true);
    }
  }, [isHomepageRoute, hasInitializedHomepage]);

  const restoreScrollPosition = (targetY: number) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: 'auto' });
      });
    });
  };

  // Manual scroll restoration + continuous RAF-throttled scroll tracking + popstate handling
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (!window.history.state || !window.history.state.historyKey) {
      window.history.replaceState(
        { ...(window.history.state || {}), path: window.location.pathname, historyKey: currentHistoryKeyRef.current },
        '',
        window.location.pathname + window.location.search
      );
    }

    let scrollRaf: number | null = null;
    const handleScroll = () => {
      if (scrollRaf !== null) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        saveScrollPosition(currentHistoryKeyRef.current, window.scrollY);
      });
    };

    const handlePopState = (e: PopStateEvent) => {
      const path = window.location.pathname;
      const targetKey =
        (e.state && typeof e.state.historyKey === 'string' ? e.state.historyKey : '') ||
        path;
      currentHistoryKeyRef.current = targetKey;

      setCurrentPath(path);
      if (path.startsWith('/category/')) {
        setSelectedCategorySlug(path.replace('/category/', ''));
        document.title = DEFAULT_DOCUMENT_TITLE;
      } else if (path === '/') {
        setSelectedCategorySlug(null);
        document.title = DEFAULT_DOCUMENT_TITLE;
      } else if (!path.startsWith('/product/')) {
        document.title = DEFAULT_DOCUMENT_TITLE;
      }

      const savedY = getScrollPosition(targetKey);
      restoreScrollPosition(savedY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('popstate', handlePopState);
    return () => {
      if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Fetch Homepage Data with SWR caching
  const fetchHomepage = async (forceFresh = false) => {
    const cached = !forceFresh ? getCachedHomepage() : { data: null, isStale: true };
    if (cached.data) {
      setHomepageData(cached.data);
      setLoadingHomepage(false);
      if (!cached.isStale) return;
    } else if (!homepageData) {
      setLoadingHomepage(true);
    }

    try {
      const data = await fetchHomepageWithCache(forceFresh || cached.isStale);
      if (data) {
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

  // Preload critical secondary route chunks on idle after homepage renders
  useEffect(() => {
    const prefetchChunks = () => {
      void import('./components/ProductDetailPage');
      void import('./components/CheckoutPage');
      void import('./components/CartDrawer');
    };
    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(prefetchChunks, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(prefetchChunks, 1200);
    return () => clearTimeout(timer);
  }, []);

  const navigateTo = (path: string) => {
    saveScrollPosition(currentHistoryKeyRef.current, window.scrollY);
    if (window.location.pathname !== path) {
      const nextKey = createHistoryKey();
      currentHistoryKeyRef.current = nextKey;
      window.history.pushState({ path, historyKey: nextKey }, '', path);
      setCurrentPath(path);
      if (path.startsWith('/category/')) {
        setSelectedCategorySlug(path.replace('/category/', ''));
        document.title = DEFAULT_DOCUMENT_TITLE;
      } else if (path === '/') {
        setSelectedCategorySlug(null);
        document.title = DEFAULT_DOCUMENT_TITLE;
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        if (!path.startsWith('/product/')) {
          document.title = DEFAULT_DOCUMENT_TITLE;
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  };

  const handleBackNavigation = (fallbackPath: string = '/') => {
    saveScrollPosition(currentHistoryKeyRef.current, window.scrollY);
    if (window.history.length > 1 && window.history.state !== null) {
      window.history.back();
    } else {
      navigateTo(fallbackPath);
    }
  };

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
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
        </div>
      );
    }
    return (
      <Suspense fallback={<RouteFallback />}>
        <AdminDashboard
          onBackToStore={() => {
            invalidateAllStoreCache();
            void fetchHomepage(true);
            handleBackNavigation('/');
          }}
          onNavigateProduct={(slug) => {
            invalidateAllStoreCache();
            void fetchHomepage(true);
            navigateTo(`/product/${slug}`);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-[#093824] selection:text-amber-200">
      
      {/* Global Header */}
      <Header
        settings={homepageData?.settings}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
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
        onNavigateOrders={() => navigateTo('/dashboard')}
        onOpenTracking={() => navigateTo('/dashboard')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isProductRoute && productSlug ? (
          <Suspense fallback={<RouteFallback />}>
            <ProductDetailPage
              productSlugOrId={productSlug}
              onBack={() => handleBackNavigation(selectedCategorySlug ? `/category/${selectedCategorySlug}` : '/')}
              onNavigateProduct={(slug) => navigateTo(`/product/${slug}`)}
              onBuyNow={handleBuyNow}
            />
          </Suspense>
        ) : isCheckoutRoute ? (
          <Suspense fallback={<RouteFallback />}>
            <CheckoutPage
              settings={homepageData?.settings}
              onBack={() => handleBackNavigation('/')}
              onOrderSuccess={(orderId) => navigateTo(`/order-success/${orderId}`)}
            />
          </Suspense>
        ) : isOrderSuccessRoute && orderSuccessId ? (
          <Suspense fallback={<RouteFallback />}>
            <OrderSuccessPage
              orderId={orderSuccessId}
              onNavigateHome={() => navigateTo('/')}
              onNavigateTrack={() => navigateTo(`/dashboard?order=${orderSuccessId}`)}
            />
          </Suspense>
        ) : isDashboardRoute ? (
          <Suspense fallback={<RouteFallback />}>
            <CustomerDashboard
              initialOrderId={new URLSearchParams(window.location.search).get('order') || ''}
              onBackToStore={() => navigateTo('/')}
              onNavigateProduct={(slug) => navigateTo(`/product/${slug}`)}
            />
          </Suspense>
        ) : null}

        {/* Keep Homepage mounted in memory once initialized for zero-latency Back restoration */}
        {(hasInitializedHomepage || isHomepageRoute) && (
          <div className={isHomepageRoute ? '' : 'hidden'} aria-hidden={!isHomepageRoute}>
            {loadingHomepage && !homepageData ? (
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
                    isVisible={isHomepageRoute}
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
                    initialProducts={homepageData?.catalog_sample}
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
              navigateTo('/dashboard');
            } else if (tab === 'account') {
              if (!user) openAuthModal('login');
              else navigateTo('/dashboard');
            }
          }}
        />
      )}

      {/* Floating WhatsApp Support Button */}
      {!isAdminRoute && (
        <FloatingWhatsApp supportWhatsapp={homepageData?.settings?.support_whatsapp} />
      )}

      {/* Slide-over Cart Drawer */}
      <Suspense fallback={null}>
        <CartDrawer onProceedCheckout={() => navigateTo('/checkout')} />
      </Suspense>

      {/* Slide-over Wishlist Drawer */}
      {isWishlistOpen && (
        <Suspense fallback={null}>
          <WishlistDrawer
            isOpen={isWishlistOpen}
            onClose={() => setIsWishlistOpen(false)}
            onSelectProduct={(p) => navigateTo(`/product/${p.slug}`)}
          />
        </Suspense>
      )}

      {/* Instant Search Modal */}
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectProduct={(p) => navigateTo(`/product/${p.slug}`)}
          />
        </Suspense>
      )}

      {/* Order Tracking Modal */}
      {isTrackingOpen && (
        <Suspense fallback={null}>
          <OrderTrackingModal
            isOpen={isTrackingOpen}
            onClose={() => setIsTrackingOpen(false)}
          />
        </Suspense>
      )}

      {/* Customer & Admin Authentication Modal */}
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>
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
