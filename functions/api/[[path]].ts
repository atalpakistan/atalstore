import {
  isSupabaseConfigured,
  getSupabaseDiagnostics,
  fetchSettingsFromSupabase,
  updateSettingsInSupabase,
  fetchCategoriesFromSupabase,
  saveCategoryInSupabase,
  deleteCategoryInSupabase,
  fetchProductsFromSupabase,
  fetchProductBySlugOrIdFromSupabase,
  saveProductInSupabase,
  deleteProductInSupabase,
  fetchBannersFromSupabase,
  saveBannerInSupabase,
  deleteBannerInSupabase,
  fetchSectionsFromSupabase,
  saveSectionsInSupabase,
  fetchLaunchSoonFromSupabase,
  saveLaunchSoonInSupabase,
  deleteLaunchSoonInSupabase,
  fetchCouponsFromSupabase,
  saveCouponInSupabase,
  deleteCouponInSupabase,
  fetchOrdersFromSupabase,
  updateOrderStatusInSupabase,
  createOrderInSupabase,
  fetchStaffFromSupabase,
  updateStaffPasswordInSupabase,
  uploadImageToSupabaseStorage,
} from '../../src/server/supabaseStore.js';

// Cloudflare Pages Wildcard Function for all /api/* routes
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

// Initial Default Fallback Data (used when database is initializing or before first sync)
const DEFAULT_SETTINGS: Record<string, any> = {
  store_name: 'ATAL STORE',
  tagline: 'Smart Shop. Live Better',
  announcement_bar_text: '🇵🇰 Free Nationwide Delivery on orders above Rs. 9,999 | Rs. 290 Delivery Fee | 100% Genuine Guaranteed',
  announcement_bar_enabled: true,
  header_logo_url: '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg',
  header_logo_height: 42,
  footer_logo_url: '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg',
  footer_description: 'ATAL – Shop Smart. Live Better. 🛍️\nYour trusted online store for beauty, cosmetics, perfumes, fashion & electronics—quality products, stylish choices, and easy shopping, all in one place. ✨',
  support_whatsapp: '03719150297',
  support_email: 'contact.to.atal@gmail.com',
  support_hours: 'Monday – Saturday: 9:00 AM – 9:00 PM PKT',
  social_facebook: 'https://www.facebook.com/share/1DgG52novy/',
  social_instagram: 'https://www.instagram.com/atal.pakistan?stkn=dXM2NTl0bHBzZ21n',
  social_tiktok: 'https://www.tiktok.com/@atal.pakistan',
  free_shipping_threshold: 9999,
  default_shipping_fee: 290,
  delivery_advance_mandatory: true,
  min_order_amount: 500,
  cod_enabled: true,
  jazzcash_enabled: true,
  jazzcash_account_title: 'Omar Farooq',
  jazzcash_account_number: '03227796097',
  jazzcash_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.26.22_PM_96ced8c4.jpeg',
  easypaisa_enabled: true,
  easypaisa_account_title: 'Omar Farooq',
  easypaisa_account_number: '03227796097',
  easypaisa_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.24.41_PM_3cd4a1f7.jpeg',
  hbl_enabled: true,
  hbl_account_title: 'Umer Farooq',
  hbl_account_number: '50627918149903',
  hbl_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-22_at_9.45.39_AM_5e21af89.jpeg',
};

const DEFAULT_CATEGORIES = [
  { id: 'cat_men', name: 'Men', slug: 'men', icon: 'Shirt', image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80', description: 'Men’s formal, casual, festive apparel, grooming, and luxury leather accessories.', display_order: 1 },
  { id: 'cat_women', name: 'Women', slug: 'women', icon: 'Sparkles', image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=600&q=80', description: 'Designer lawn, luxury pret, footwear, handbags, and fine Pakistani jewellery.', display_order: 2 },
  { id: 'cat_kids', name: 'Kids', slug: 'kids', icon: 'Baby', image: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=600&q=80', description: 'Comfortable festive and everyday wear for boys, girls, babies, and educational toys.', display_order: 3 },
  { id: 'cat_cosmetics', name: 'Cosmetics & Perfume', slug: 'cosmetics-perfume', icon: 'Flame', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80', description: 'Premium skincare, authentic oud, Arabian fragrances, and organic beauty kits.', display_order: 4 },
  { id: 'cat_electronics', name: 'Electronics', slug: 'electronics', icon: 'Headphones', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80', description: 'ANC earbuds, smartwatches, fast charging adapters, and premium mobile accessories.', display_order: 5 },
];

const DEFAULT_HOMEPAGE_SECTIONS = [
  { section_key: 'carousel', title: 'Featured Promotions', subtitle: 'Exclusive seasonal highlights', is_enabled: 1, display_order: 1, layout: 'carousel', max_items: 12 },
  { section_key: 'categories', title: 'Shop by Category', subtitle: 'Explore curated Pakistani collections', is_enabled: 1, display_order: 2, layout: 'horizontal_row', max_items: 12 },
  { section_key: 'festive_deals', title: '⚡ Featured Festive Deals', subtitle: 'Exclusive limited-time savings across Pakistan', is_enabled: 1, display_order: 3, layout: 'carousel', max_items: 12 },
  { section_key: 'spotlight', title: 'Spotlight Products', subtitle: 'Handcrafted precision and luxury picks', is_enabled: 1, display_order: 4, layout: 'featured_split', max_items: 12 },
  { section_key: 'all_products', title: 'Shop All Products', subtitle: 'Browse our comprehensive verified catalog', is_enabled: 1, display_order: 5, layout: 'grid', max_items: 12 },
  { section_key: 'new_launch', title: 'New Launch', subtitle: 'Freshly arrived this week in store', is_enabled: 1, display_order: 6, layout: 'carousel', max_items: 12 },
  { section_key: 'launch_soon', title: 'Launch Soon', subtitle: 'Upcoming drops with priority notifications', is_enabled: 1, display_order: 7, layout: 'carousel', max_items: 12 },
];

const DEFAULT_BANNERS = [
  { id: 'ban_01', title: 'FESTIVE EID & WEDDING COLLECTION', subtitle: 'Handcrafted Pakistani luxury kurtas, sherwanis, and lawn ensembles.', image_url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1600&q=80', cta_text: 'Explore Festive Deals', cta_url: '/category/men', display_order: 1, is_active: 1 },
  { id: 'ban_02', title: 'ATAL AUDIOPHILE PRO SERIES', subtitle: 'Wireless Active Noise Cancellation designed for Pakistani professionals.', image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80', cta_text: 'Shop Electronics', cta_url: '/category/electronics', display_order: 2, is_active: 1 },
  { id: 'ban_03', title: 'DAMASCUS ROSE & OUD COUTURE', subtitle: 'Pure essential elixirs and oriental fragrances distilled for royalty.', image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1600&q=80', cta_text: 'Discover Perfumes', cta_url: '/category/cosmetics-perfume', display_order: 3, is_active: 1 },
];

const DEFAULT_PRODUCTS = [
  {
    id: 'prod_01',
    name: 'Royal Oud & Amber Essence 50ml',
    slug: 'royal-oud-amber-essence-50ml',
    sku: 'ATAL-PERF-001',
    brand: 'ATAL Couture',
    category_id: 'cat_cosmetics',
    short_description: 'Pure concentrated Arabian Oud infused with royal amber and damascus rose notes.',
    description: 'Hand-blended artisanal oriental elixir with long-lasting projection (24+ hours). Ideal for special occasions and daily luxury.',
    images: ['https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80'],
    purchase_price: 3500,
    original_price: 7500,
    sale_price: 5490,
    currency: 'PKR',
    available_stock: 25,
    low_stock_threshold: 5,
    rating: 4.9,
    reviews_count: 18,
    festive_deal: 1,
    spotlight: 1,
    new_launch: 1,
    variants: [],
  },
  {
    id: 'prod_02',
    name: 'ANC Pro Wireless Earbuds',
    slug: 'anc-pro-wireless-earbuds',
    sku: 'ATAL-ELEC-002',
    brand: 'ATAL Audio',
    category_id: 'cat_electronics',
    short_description: '35dB Active Noise Cancellation with HD dual microphones and fast wireless charging.',
    description: 'Experience deep bass and crystal clear calling. Designed for remote meetings, music lovers, and travel.',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'],
    purchase_price: 2800,
    original_price: 6990,
    sale_price: 4890,
    currency: 'PKR',
    available_stock: 14,
    low_stock_threshold: 5,
    rating: 4.8,
    reviews_count: 32,
    festive_deal: 1,
    spotlight: 1,
    new_launch: 0,
    variants: [],
  },
];

const DEFAULT_STAFF = [
  { id: 'usr_admin_uatal', email: 'uatal.pk@gmail.com', full_name: 'Umer (Administrator)', phone: '03719150297', role: 'admin' },
  { id: 'usr_emp_ali', email: 'ali@atal.com', full_name: 'Ali (Store Manager)', phone: '03719150297', role: 'employee' },
];

function verifyAdmin(request: Request): boolean {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [userId, role] = decoded.split(':');
    return (role === 'admin' || role === 'employee') && Boolean(userId);
  } catch {
    return false;
  }
}

const DB_NOT_CONFIGURED_ERROR =
  'Persistent database is not connected. In your Cloudflare Pages Dashboard, go to Settings -> Environment Variables, and add SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY). Then execute supabase_schema.sql in your Supabase SQL editor.';

export const onRequest = async (context: { request: Request; params: { path?: string[] }; env?: any }) => {
  const { request, params, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const pathParts = params.path || url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const endpoint = pathParts.join('/');

  // -------------------------------------------------------------
  // PUBLIC ENDPOINTS
  // -------------------------------------------------------------

  // 1. /api/config & /api/settings
  if ((endpoint === 'config' || endpoint === 'settings') && request.method === 'GET') {
    if (isSupabaseConfigured(env)) {
      const sbSettings = await fetchSettingsFromSupabase(env);
      if (sbSettings) return jsonResponse(sbSettings);
    }
    return jsonResponse(DEFAULT_SETTINGS);
  }

  // 2. /api/homepage
  if (endpoint === 'homepage' && request.method === 'GET') {
    if (isSupabaseConfigured(env)) {
      const [settings, sections, banners, categories, products, launchSoon] = await Promise.all([
        fetchSettingsFromSupabase(env),
        fetchSectionsFromSupabase(env),
        fetchBannersFromSupabase(env),
        fetchCategoriesFromSupabase(env),
        fetchProductsFromSupabase(env),
        fetchLaunchSoonFromSupabase(env),
      ]);

      const resolvedSettings = settings || DEFAULT_SETTINGS;
      const resolvedSections = sections && sections.length > 0 ? sections : DEFAULT_HOMEPAGE_SECTIONS;
      const resolvedBanners = banners && banners.length > 0 ? banners : DEFAULT_BANNERS;
      const resolvedCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
      const resolvedProducts = products && products.length > 0 ? products : DEFAULT_PRODUCTS;
      const resolvedLaunchSoon = launchSoon || [];

      return jsonResponse({
        settings: resolvedSettings,
        sections: resolvedSections,
        banners: resolvedBanners,
        categories: resolvedCategories,
        festive_deals: resolvedProducts.filter((p: any) => p.festive_deal === 1),
        spotlight_products: resolvedProducts.filter((p: any) => p.spotlight === 1),
        new_launches: resolvedProducts.filter((p: any) => p.new_launch === 1),
        launch_soon: resolvedLaunchSoon,
        catalog_sample: resolvedProducts.slice(0, 12),
      });
    }

    return jsonResponse({
      settings: DEFAULT_SETTINGS,
      sections: DEFAULT_HOMEPAGE_SECTIONS,
      banners: DEFAULT_BANNERS,
      categories: DEFAULT_CATEGORIES,
      festive_deals: DEFAULT_PRODUCTS.filter((p: any) => p.festive_deal === 1),
      spotlight_products: DEFAULT_PRODUCTS.filter((p: any) => p.spotlight === 1),
      new_launches: DEFAULT_PRODUCTS.filter((p: any) => p.new_launch === 1),
      launch_soon: [],
      catalog_sample: DEFAULT_PRODUCTS.slice(0, 12),
    });
  }

  // 3. /api/categories
  if (endpoint === 'categories' && request.method === 'GET') {
    if (isSupabaseConfigured(env)) {
      const cats = await fetchCategoriesFromSupabase(env);
      if (cats && cats.length > 0) return jsonResponse(cats);
    }
    return jsonResponse(DEFAULT_CATEGORIES);
  }

  // 4. /api/products
  if (endpoint === 'products' && request.method === 'GET') {
    if (isSupabaseConfigured(env)) {
      const prods = await fetchProductsFromSupabase(env);
      if (prods) {
        return jsonResponse({
          products: prods,
          pagination: { page: 1, limit: 50, total: prods.length, totalPages: 1 },
        });
      }
    }
    return jsonResponse({
      products: DEFAULT_PRODUCTS,
      pagination: { page: 1, limit: 50, total: DEFAULT_PRODUCTS.length, totalPages: 1 },
    });
  }

  // Single Product
  if (endpoint.startsWith('products/') && request.method === 'GET') {
    const slugOrId = endpoint.replace(/^products\//, '');
    if (isSupabaseConfigured(env)) {
      const res = await fetchProductBySlugOrIdFromSupabase(slugOrId, env);
      if (res) return jsonResponse(res);
    }
    const rawProduct = DEFAULT_PRODUCTS.find((p: any) => p.slug === slugOrId || p.id === slugOrId);
    if (!rawProduct) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }
    const related = DEFAULT_PRODUCTS.filter((p: any) => p.id !== rawProduct.id).slice(0, 4);
    return jsonResponse({ product: rawProduct, related });
  }

  // Place Order
  if (endpoint === 'orders' && request.method === 'POST') {
    try {
      const body = await request.json();
      if (!isSupabaseConfigured(env)) {
        return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
      }
      const sbRes = await createOrderInSupabase(body, env);
      if (sbRes.success) {
        return jsonResponse({ success: true, orderId: sbRes.order.id, order: sbRes.order });
      }
      return jsonResponse({ error: sbRes.error || 'Failed to place order in database' }, 400);
    } catch (err: any) {
      return jsonResponse({ error: err?.message || 'Failed to process order' }, 400);
    }
  }

  // Order Lookup by ID
  if (endpoint.startsWith('orders/') && request.method === 'GET' && !endpoint.startsWith('orders/track')) {
    const orderId = endpoint.replace(/^orders\//, '').trim().toUpperCase();
    if (isSupabaseConfigured(env)) {
      const orders = await fetchOrdersFromSupabase(env);
      const match = orders?.find((o: any) => (o.id || '').toUpperCase() === orderId);
      if (match) return jsonResponse(match);
    }
    return jsonResponse({ error: `Order #${orderId} was not found in our database.` }, 404);
  }

  // Public Order Tracking
  if (endpoint === 'orders/track' && request.method === 'POST') {
    try {
      const { order_id, phone } = await request.json();
      if (!order_id || !order_id.toString().trim()) {
        return jsonResponse({ error: 'Please enter your Order Number or Courier Consignment Number.' }, 400);
      }
      const cleanInput = order_id.toString().trim().toUpperCase();
      let ordersList: any[] = [];
      if (isSupabaseConfigured(env)) {
        ordersList = (await fetchOrdersFromSupabase(env)) || [];
      }

      const match = ordersList.find((o: any) => {
        const idUpper = (o.id || '').toUpperCase();
        const trkUpper = (o.tracking_number || '').toUpperCase();
        const txUpper = (o.transaction_id || o.transaction_ref || '').toUpperCase();
        return (
          idUpper === cleanInput ||
          idUpper === `ATL-${cleanInput}` ||
          idUpper === cleanInput.replace(/^ATL-/, '') ||
          trkUpper === cleanInput ||
          txUpper === cleanInput
        );
      });

      if (!match) {
        return jsonResponse(
          { error: `No active order found with identifier "${cleanInput}". Please check your order confirmation.` },
          404
        );
      }

      if (phone && phone.toString().trim()) {
        const inputDigits = phone.toString().replace(/\D/g, '').slice(-7);
        const orderDigits = (match.phone || '').toString().replace(/\D/g, '').slice(-7);
        if (inputDigits && orderDigits && inputDigits !== orderDigits) {
          return jsonResponse({ error: 'The phone number provided does not match this order.' }, 403);
        }
      }

      return jsonResponse(match);
    } catch {
      return jsonResponse({ error: 'Error processing tracking request' }, 500);
    }
  }

  // Coupon Validation
  if (endpoint === 'coupons/validate' && request.method === 'POST') {
    try {
      const { code, subtotal = 0 } = await request.json();
      if (!code) return jsonResponse({ error: 'Coupon code required' }, 400);

      let couponsList: any[] = [];
      if (isSupabaseConfigured(env)) {
        couponsList = (await fetchCouponsFromSupabase(env)) || [];
      } else {
        couponsList = [{ id: 'cp_welcome', code: 'ATAL10', discount_type: 'percentage', discount_value: 10, min_order_amount: 2000, is_active: 1 }];
      }

      const cp = couponsList.find((c: any) => c.code.toUpperCase() === String(code).toUpperCase() && c.is_active === 1);
      if (!cp) return jsonResponse({ error: 'Invalid or expired coupon code' }, 404);

      if (cp.min_order_amount && subtotal < cp.min_order_amount) {
        return jsonResponse({
          error: `This coupon requires a minimum order of Rs. ${cp.min_order_amount.toLocaleString('en-PK')}`,
        }, 400);
      }

      let discount = cp.discount_type === 'percentage' ? (subtotal * cp.discount_value) / 100 : cp.discount_value;
      discount = Math.min(discount, subtotal);
      return jsonResponse({ valid: true, code: cp.code, discount });
    } catch {
      return jsonResponse({ error: 'Invalid coupon check' }, 400);
    }
  }

  // -------------------------------------------------------------
  // ADMIN PROTECTED ENDPOINTS
  // -------------------------------------------------------------

  if (endpoint.startsWith('admin/')) {
    if (!verifyAdmin(request)) {
      return jsonResponse({ error: 'Unauthorized: Staff or Administrator access required' }, 403);
    }

    // Diagnostic Status Endpoint
    if (endpoint === 'admin/db-status' && request.method === 'GET') {
      const diag = await getSupabaseDiagnostics(env);
      return jsonResponse(diag);
    }

    // A. Metrics
    if (endpoint === 'admin/metrics' && request.method === 'GET') {
      let ordersList: any[] = [];
      let productsList: any[] = [];

      if (isSupabaseConfigured(env)) {
        ordersList = (await fetchOrdersFromSupabase(env)) || [];
        productsList = (await fetchProductsFromSupabase(env)) || [];
      } else {
        productsList = DEFAULT_PRODUCTS;
      }

      const totalOrders = ordersList.length;
      const todayDateStr = new Date().toISOString().slice(0, 10);
      let totalSales = 0;
      let todaySales = 0;

      for (const o of ordersList) {
        if (o.order_status !== 'Cancelled') {
          const amt = Number(o.total_amount || 0);
          totalSales += amt;
          const orderDate = (o.created_at || '').slice(0, 10);
          if (orderDate === todayDateStr || !o.created_at) {
            todaySales += amt;
          }
        }
      }

      return jsonResponse({
        totalOrders,
        todayOrders: ordersList.filter((o: any) => (o.created_at || '').slice(0, 10) === todayDateStr).length,
        pendingOrders: ordersList.filter((o: any) => o.order_status === 'Pending').length,
        processingOrders: ordersList.filter((o: any) => o.order_status === 'Processing' || o.order_status === 'Confirmed').length,
        shippedOrders: ordersList.filter((o: any) => o.order_status === 'Shipped' || o.order_status === 'Ready to Ship').length,
        deliveredOrders: ordersList.filter((o: any) => o.order_status === 'Delivered').length,
        cancelledOrders: ordersList.filter((o: any) => o.order_status === 'Cancelled').length,
        totalSales,
        todaySales,
        lowStockProducts: productsList.filter((p: any) => (p.available_stock || 0) <= (p.low_stock_threshold || 5)),
        recentOrders: ordersList.slice(0, 8),
      });
    }

    // B. Products
    if (endpoint === 'admin/products') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const prods = await fetchProductsFromSupabase(env);
          if (prods) return jsonResponse(prods);
        }
        return jsonResponse(DEFAULT_PRODUCTS);
      }
      if (request.method === 'POST') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveProductInSupabase(body, env);
        if (sbRes.success) return jsonResponse(sbRes);
        return jsonResponse({ error: sbRes.error || 'Failed to save product to database' }, 500);
      }
    }

    if (endpoint.startsWith('admin/products/')) {
      const sub = endpoint.replace('admin/products/', '');

      // Duplicate
      if (sub.endsWith('/duplicate') && request.method === 'POST') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const origId = sub.replace('/duplicate', '');
        const allProds = await fetchProductsFromSupabase(env);
        const orig = allProds?.find((p: any) => p.id === origId);
        if (!orig) return jsonResponse({ error: 'Original product not found' }, 404);

        const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const slug = `${orig.slug}-copy-${Date.now().toString().slice(-4)}`;
        const copy = { ...orig, id, slug, name: `${orig.name} (Copy)` };

        const sbRes = await saveProductInSupabase(copy, env);
        if (sbRes.success) return jsonResponse(sbRes);
        return jsonResponse({ error: sbRes.error || 'Failed to duplicate product in database' }, 500);
      }

      const prodId = sub;
      if (request.method === 'PUT') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveProductInSupabase({ ...body, id: prodId }, env);
        if (sbRes.success) return jsonResponse(sbRes);
        return jsonResponse({ error: sbRes.error || 'Failed to update product in database' }, 500);
      }

      if (request.method === 'DELETE') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const sbRes = await deleteProductInSupabase(prodId, env);
        if (sbRes.success) return jsonResponse({ success: true });
        return jsonResponse({ error: sbRes.error || 'Failed to delete product from database' }, 500);
      }
    }

    // C. Categories
    if (endpoint === 'admin/categories') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const cats = await fetchCategoriesFromSupabase(env);
          if (cats) return jsonResponse(cats);
        }
        return jsonResponse(DEFAULT_CATEGORIES);
      }
      if (request.method === 'POST') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveCategoryInSupabase(body, env);
        if (sbRes.success) return jsonResponse(sbRes);
        return jsonResponse({ error: sbRes.error || 'Failed to save category to database' }, 500);
      }
    }

    if (endpoint.startsWith('admin/categories/')) {
      const catId = endpoint.replace('admin/categories/', '');
      if (request.method === 'PUT') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveCategoryInSupabase({ ...body, id: catId }, env);
        if (sbRes.success) return jsonResponse(sbRes);
        return jsonResponse({ error: sbRes.error || 'Failed to update category in database' }, 500);
      }
      if (request.method === 'DELETE') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const sbRes = await deleteCategoryInSupabase(catId, env);
        if (sbRes.success) return jsonResponse({ success: true });
        return jsonResponse({ error: sbRes.error || 'Failed to delete category from database' }, 400);
      }
    }

    // D. Orders
    if (endpoint === 'admin/orders' && request.method === 'GET') {
      if (isSupabaseConfigured(env)) {
        const orders = await fetchOrdersFromSupabase(env);
        if (orders) return jsonResponse(orders);
      }
      return jsonResponse([]);
    }

    if (endpoint.startsWith('admin/orders/') && request.method === 'PUT') {
      const orderId = endpoint.replace('admin/orders/', '');
      const body = await request.json().catch(() => ({}));
      if (!isSupabaseConfigured(env)) {
        return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
      }
      const sbRes = await updateOrderStatusInSupabase(orderId, body, env);
      if (sbRes.success) return jsonResponse({ success: true });
      return jsonResponse({ error: sbRes.error || 'Failed to update order status in database' }, 500);
    }

    // E. Banners
    if (endpoint === 'admin/banners') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const banners = await fetchBannersFromSupabase(env);
          if (banners) return jsonResponse(banners);
        }
        return jsonResponse(DEFAULT_BANNERS);
      }
      if (request.method === 'POST') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveBannerInSupabase(body, env);
        if (sbRes.success) return jsonResponse(sbRes);
        return jsonResponse({ error: sbRes.error || 'Failed to save banner' }, 500);
      }
    }

    if (endpoint.startsWith('admin/banners/')) {
      const banId = endpoint.replace('admin/banners/', '');
      if (request.method === 'PUT') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveBannerInSupabase({ ...body, id: banId }, env);
        if (sbRes.success) return jsonResponse({ success: true });
        return jsonResponse({ error: sbRes.error || 'Failed to update banner' }, 500);
      }
      if (request.method === 'DELETE') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const sbRes = await deleteBannerInSupabase(banId, env);
        if (sbRes.success) return jsonResponse({ success: true });
        return jsonResponse({ error: sbRes.error || 'Failed to delete banner' }, 500);
      }
    }

    // F. Homepage Sections
    if (endpoint === 'admin/homepage') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const sections = await fetchSectionsFromSupabase(env);
          if (sections && sections.length > 0) return jsonResponse(sections);
        }
        return jsonResponse(DEFAULT_HOMEPAGE_SECTIONS);
      }
      if (request.method === 'PUT') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const { sections } = await request.json().catch(() => ({}));
        if (!Array.isArray(sections)) {
          return jsonResponse({ error: 'Sections array required' }, 400);
        }
        const sbRes = await saveSectionsInSupabase(sections, env);
        if (sbRes.success) return jsonResponse({ success: true, message: 'Homepage sections updated permanently.' });
        return jsonResponse({ error: sbRes.error || 'Failed to update sections' }, 500);
      }
    }

    // G. Launch Soon
    if (endpoint === 'admin/launch-soon') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const items = await fetchLaunchSoonFromSupabase(env);
          if (items) return jsonResponse(items);
        }
        return jsonResponse([]);
      }
      if (request.method === 'POST') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveLaunchSoonInSupabase(body, env);
        if (sbRes.success) return jsonResponse(sbRes);
        return jsonResponse({ error: sbRes.error || 'Failed to save upcoming drop' }, 500);
      }
    }

    if (endpoint.startsWith('admin/launch-soon/')) {
      const lsId = endpoint.replace('admin/launch-soon/', '');
      if (request.method === 'PUT') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveLaunchSoonInSupabase({ ...body, id: lsId }, env);
        if (sbRes.success) return jsonResponse({ success: true });
        return jsonResponse({ error: sbRes.error || 'Failed to update launch soon item' }, 500);
      }
      if (request.method === 'DELETE') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const sbRes = await deleteLaunchSoonInSupabase(lsId, env);
        if (sbRes.success) return jsonResponse({ success: true });
        return jsonResponse({ error: sbRes.error || 'Failed to delete launch soon item' }, 500);
      }
    }

    // H. Coupons
    if (endpoint === 'admin/coupons') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const cps = await fetchCouponsFromSupabase(env);
          if (cps) return jsonResponse(cps);
        }
        return jsonResponse([{ id: 'cp_welcome', code: 'ATAL10', discount_type: 'percentage', discount_value: 10, min_order_amount: 2000, usage_count: 0, is_active: 1 }]);
      }
      if (request.method === 'POST') {
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const sbRes = await saveCouponInSupabase(body, env);
        if (sbRes.success) return jsonResponse(sbRes);
        return jsonResponse({ error: sbRes.error || 'Failed to save coupon' }, 500);
      }
    }

    if (endpoint.startsWith('admin/coupons/') && request.method === 'DELETE') {
      const cpId = endpoint.replace('admin/coupons/', '');
      if (!isSupabaseConfigured(env)) {
        return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
      }
      const sbRes = await deleteCouponInSupabase(cpId, env);
      if (sbRes.success) return jsonResponse({ success: true });
      return jsonResponse({ error: sbRes.error || 'Failed to delete coupon' }, 500);
    }

    // I. Settings
    if (endpoint === 'admin/settings') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const sbSettings = await fetchSettingsFromSupabase(env);
          if (sbSettings) return jsonResponse(sbSettings);
        }
        return jsonResponse(DEFAULT_SETTINGS);
      }
      if (request.method === 'PUT') {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonResponse({ error: 'Invalid JSON payload: Object required' }, 400);
        }
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }
        const sbRes = await updateSettingsInSupabase(body, env);
        if (sbRes.success) {
          return jsonResponse({ success: true, message: 'Settings saved permanently in Supabase database.' });
        }
        return jsonResponse({ error: sbRes.error || 'Failed to save settings to database' }, 500);
      }
    }

    // J. Staff & Passwords
    if (endpoint === 'admin/staff' && request.method === 'GET') {
      if (isSupabaseConfigured(env)) {
        const staff = await fetchStaffFromSupabase(env);
        if (staff && staff.length > 0) return jsonResponse(staff);
      }
      return jsonResponse(DEFAULT_STAFF);
    }

    if (endpoint === 'admin/staff/update-password' && request.method === 'POST') {
      try {
        const { user_id, new_password } = await request.json().catch(() => ({}));
        if (!user_id || !new_password || String(new_password).trim().length < 4) {
          return jsonResponse({ error: 'Valid user ID and new password (min 4 characters) are required.' }, 400);
        }
        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }

        // Web Crypto SHA-256 HMAC hash
        const encoder = new TextEncoder();
        const keyData = encoder.encode('atal_salt_2026_pk');
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(String(new_password).trim()));
        const hashHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

        const sbRes = await updateStaffPasswordInSupabase(user_id, hashHex, env);
        if (sbRes.success) {
          return jsonResponse({ success: true, message: 'Password successfully updated in Supabase database.' });
        }
        return jsonResponse({ error: sbRes.error || 'Failed to update staff password' }, 500);
      } catch (err: any) {
        return jsonResponse({ error: err?.message || 'Password update failed' }, 500);
      }
    }

    // K. Backup Export & Import
    if (endpoint === 'admin/backup/export' && request.method === 'GET') {
      let currentSettings = DEFAULT_SETTINGS;
      let currentCategories = DEFAULT_CATEGORIES;
      let currentProducts = DEFAULT_PRODUCTS;
      let currentBanners = DEFAULT_BANNERS;
      let currentSections = DEFAULT_HOMEPAGE_SECTIONS;
      let currentLaunchSoon: any[] = [];
      let currentCoupons: any[] = [];

      if (isSupabaseConfigured(env)) {
        const [sbSet, sbCat, sbProd, sbBan, sbSec, sbLs, sbCp] = await Promise.all([
          fetchSettingsFromSupabase(env),
          fetchCategoriesFromSupabase(env),
          fetchProductsFromSupabase(env),
          fetchBannersFromSupabase(env),
          fetchSectionsFromSupabase(env),
          fetchLaunchSoonFromSupabase(env),
          fetchCouponsFromSupabase(env),
        ]);
        if (sbSet) currentSettings = sbSet;
        if (sbCat) currentCategories = sbCat;
        if (sbProd) currentProducts = sbProd;
        if (sbBan) currentBanners = sbBan;
        if (sbSec) currentSections = sbSec;
        if (sbLs) currentLaunchSoon = sbLs;
        if (sbCp) currentCoupons = sbCp;
      }

      return jsonResponse({
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        store_name: 'ATAL STORE',
        settings: Object.entries(currentSettings).map(([key, value]) => ({ key, value })),
        categories: currentCategories,
        products: currentProducts,
        banners: currentBanners,
        homepage_sections: currentSections,
        launch_soon: currentLaunchSoon,
        coupons: currentCoupons,
      });
    }

    if (endpoint === 'admin/backup/import' && request.method === 'POST') {
      try {
        const { backupData, dryRun = false } = await request.json().catch(() => ({}));
        if (!backupData || typeof backupData !== 'object' || !backupData.version) {
          return jsonResponse({ error: 'Invalid backup file: Not a valid JSON document' }, 400);
        }
        const preview = {
          categories: Array.isArray(backupData.categories) ? backupData.categories.length : 0,
          products: Array.isArray(backupData.products) ? backupData.products.length : 0,
          banners: Array.isArray(backupData.banners) ? backupData.banners.length : 0,
          settings: Array.isArray(backupData.settings) ? backupData.settings.length : 0,
        };
        if (dryRun) {
          return jsonResponse({ success: true, dryRun: true, preview, message: 'Backup validation passed. Ready to restore.' });
        }

        if (!isSupabaseConfigured(env)) {
          return jsonResponse({ error: DB_NOT_CONFIGURED_ERROR }, 503);
        }

        if (Array.isArray(backupData.categories)) {
          for (const cat of backupData.categories) await saveCategoryInSupabase(cat, env);
        }
        if (Array.isArray(backupData.products)) {
          for (const p of backupData.products) await saveProductInSupabase(p, env);
        }
        if (Array.isArray(backupData.banners)) {
          for (const b of backupData.banners) await saveBannerInSupabase(b, env);
        }
        if (Array.isArray(backupData.settings)) {
          const setObj: Record<string, any> = {};
          for (const s of backupData.settings) if (s.key) setObj[s.key] = s.value;
          await updateSettingsInSupabase(setObj, env);
        }

        return jsonResponse({ success: true, message: 'Backup imported into Supabase database successfully.', recordsRestored: preview });
      } catch (err: any) {
        return jsonResponse({ error: `Import failed: ${err?.message}` }, 400);
      }
    }

    // L. Upload
    if (endpoint === 'admin/upload' && request.method === 'POST') {
      try {
        const { filename, base64Data } = await request.json().catch(() => ({}));
        if (!filename || !base64Data) {
          return jsonResponse({ error: 'Filename and base64Data required' }, 400);
        }
        if (isSupabaseConfigured(env)) {
          const publicUrl = await uploadImageToSupabaseStorage(filename, base64Data, env);
          return jsonResponse({ success: true, url: publicUrl });
        }
        return jsonResponse({ success: true, url: base64Data });
      } catch (err: any) {
        return jsonResponse({ error: err?.message || 'Upload failed' }, 500);
      }
    }
  }

  return jsonResponse({ error: `API route not found: ${request.method} ${endpoint}` }, 404);
};
