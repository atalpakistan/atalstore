import {
  isSupabaseConfigured,
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
  fetchOrdersFromSupabase,
  updateOrderStatusInSupabase,
  createOrderInSupabase,
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

// Initial Default State
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

function getStoreState() {
  if (!(globalThis as any).__ATAL_DATA__) {
    (globalThis as any).__ATAL_DATA__ = {
      settings: { ...DEFAULT_SETTINGS },
      categories: [...DEFAULT_CATEGORIES],
      products: [
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
          variants: []
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
          variants: []
        }
      ],
      orders: [],
      banners: [...DEFAULT_BANNERS],
      homepage_sections: [...DEFAULT_HOMEPAGE_SECTIONS],
      launch_soon: [],
      coupons: [
        { id: 'cp_welcome', code: 'ATAL10', discount_type: 'percentage', discount_value: 10, min_order_amount: 2000, usage_count: 0, is_active: 1 }
      ],
      staff: [
        { id: 'usr_admin_uatal', email: 'uatal.pk@gmail.com', full_name: 'Umer (Administrator)', phone: '03719150297', role: 'admin' },
        { id: 'usr_emp_ali', email: 'ali@atal.com', full_name: 'Ali (Store Manager)', phone: '03719150297', role: 'employee' }
      ]
    };
  }
  return (globalThis as any).__ATAL_DATA__;
}

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

export const onRequest = async (context: { request: Request; params: { path?: string[] }; env?: any }) => {
  const { request, params, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const pathParts = params.path || url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const endpoint = pathParts.join('/');
  const state = getStoreState();

  // -------------------------------------------------------------
  // PUBLIC ENDPOINTS
  // -------------------------------------------------------------

  // 1. /api/config
  if (endpoint === 'config' && request.method === 'GET') {
    if (isSupabaseConfigured(env)) {
      const sbSettings = await fetchSettingsFromSupabase(env);
      if (sbSettings) return jsonResponse(sbSettings);
    }
    return jsonResponse(state.settings);
  }

  // 2. /api/homepage
  if (endpoint === 'homepage' && request.method === 'GET') {
    if (isSupabaseConfigured(env)) {
      const settings = (await fetchSettingsFromSupabase(env)) || state.settings;
      const sections = (await fetchSectionsFromSupabase(env)) || state.homepage_sections;
      const banners = (await fetchBannersFromSupabase(env)) || state.banners;
      const categories = (await fetchCategoriesFromSupabase(env)) || state.categories;
      const products = (await fetchProductsFromSupabase(env)) || state.products;
      return jsonResponse({
        settings,
        sections,
        banners,
        categories,
        festive_deals: products.filter((p: any) => p.festive_deal === 1),
        spotlight_products: products.filter((p: any) => p.spotlight === 1),
        new_launches: products.filter((p: any) => p.new_launch === 1),
        launch_soon: state.launch_soon,
        catalog_sample: products.slice(0, 12),
      });
    }
    return jsonResponse({
      settings: state.settings,
      sections: state.homepage_sections,
      banners: state.banners,
      categories: state.categories,
      festive_deals: state.products.filter((p: any) => p.festive_deal === 1),
      spotlight_products: state.products.filter((p: any) => p.spotlight === 1),
      new_launches: state.products.filter((p: any) => p.new_launch === 1),
      launch_soon: state.launch_soon,
      catalog_sample: state.products.slice(0, 12),
    });
  }

  // 3. /api/categories
  if (endpoint === 'categories' && request.method === 'GET') {
    if (isSupabaseConfigured(env)) {
      const cats = await fetchCategoriesFromSupabase(env);
      if (cats) return jsonResponse(cats);
    }
    return jsonResponse(state.categories);
  }

  // 4. /api/products
  if (endpoint === 'products' && request.method === 'GET') {
    if (isSupabaseConfigured(env)) {
      const prods = await fetchProductsFromSupabase(env);
      if (prods) {
        return jsonResponse({
          products: prods,
          pagination: { page: 1, limit: 50, total: prods.length, totalPages: 1 }
        });
      }
    }
    return jsonResponse({
      products: state.products,
      pagination: { page: 1, limit: 50, total: state.products.length, totalPages: 1 }
    });
  }

  // Single Product
  if (endpoint.startsWith('products/') && request.method === 'GET') {
    const slugOrId = endpoint.replace(/^products\//, '');
    if (isSupabaseConfigured(env)) {
      const res = await fetchProductBySlugOrIdFromSupabase(slugOrId, env);
      if (res) return jsonResponse(res);
    }
    const rawProduct = state.products.find((p: any) => p.slug === slugOrId || p.id === slugOrId);
    if (!rawProduct) {
      return jsonResponse({ error: 'Product not found' }, 404);
    }
    const product = {
      ...rawProduct,
      rating: typeof rawProduct.rating === 'number' && !isNaN(rawProduct.rating) ? rawProduct.rating : 5.0,
      reviews_count: typeof rawProduct.reviews_count === 'number' && !isNaN(rawProduct.reviews_count) ? rawProduct.reviews_count : 0,
      sale_price: typeof rawProduct.sale_price === 'number' && !isNaN(rawProduct.sale_price) ? rawProduct.sale_price : 0,
      original_price: typeof rawProduct.original_price === 'number' && !isNaN(rawProduct.original_price) ? rawProduct.original_price : (rawProduct.sale_price || 0),
      available_stock: typeof rawProduct.available_stock === 'number' ? rawProduct.available_stock : 10,
      images: Array.isArray(rawProduct.images) && rawProduct.images.length > 0 ? rawProduct.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80']
    };
    const related = state.products
      .filter((p: any) => p.id !== product.id)
      .slice(0, 4)
      .map((rp: any) => ({
        ...rp,
        rating: typeof rp.rating === 'number' && !isNaN(rp.rating) ? rp.rating : 5.0,
        reviews_count: typeof rp.reviews_count === 'number' && !isNaN(rp.reviews_count) ? rp.reviews_count : 0,
        sale_price: typeof rp.sale_price === 'number' && !isNaN(rp.sale_price) ? rp.sale_price : 0,
      }));
    return jsonResponse({ product, related });
  }

  // Place Order
  if (endpoint === 'orders' && request.method === 'POST') {
    try {
      const body = await request.json();
      if (isSupabaseConfigured(env)) {
        const sbRes = await createOrderInSupabase(body, env);
        if (sbRes.success) return jsonResponse({ success: true, order: sbRes.order });
      }
      const orderId = `ATAL-2026-${state.orders.length + 10240}`;
      const newOrder = {
        id: orderId,
        customer_name: body.customer_name || 'Customer',
        phone: body.phone,
        total_amount: body.subtotal || 1000,
        payment_method: body.payment_method || 'cod',
        payment_status: 'pending',
        order_status: 'Pending',
        created_at: new Date().toISOString(),
        items: body.items || []
      };
      state.orders.unshift(newOrder);
      return jsonResponse({ success: true, order: newOrder });
    } catch (err: any) {
      return jsonResponse({ error: err?.message || 'Failed to place order' }, 400);
    }
  }

  // Coupon Validation
  if (endpoint === 'coupons/validate' && request.method === 'POST') {
    try {
      const { code, subtotal = 0 } = await request.json();
      const cp = state.coupons.find((c: any) => c.code.toUpperCase() === String(code).toUpperCase() && c.is_active === 1);
      if (!cp) return jsonResponse({ error: 'Invalid or expired coupon code' }, 404);
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

    // A. Metrics
    if (endpoint === 'admin/metrics' && request.method === 'GET') {
      let ordersList = state.orders;
      let productsList = state.products;
      if (isSupabaseConfigured(env)) {
        ordersList = (await fetchOrdersFromSupabase(env)) || state.orders;
        productsList = (await fetchProductsFromSupabase(env)) || state.products;
      }
      const totalOrders = ordersList.length;
      const totalSales = ordersList.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
      return jsonResponse({
        totalOrders,
        todayOrders: totalOrders,
        pendingOrders: ordersList.filter((o: any) => o.order_status === 'Pending').length,
        processingOrders: ordersList.filter((o: any) => o.order_status === 'Processing').length,
        shippedOrders: ordersList.filter((o: any) => o.order_status === 'Shipped').length,
        deliveredOrders: ordersList.filter((o: any) => o.order_status === 'Delivered').length,
        cancelledOrders: ordersList.filter((o: any) => o.order_status === 'Cancelled').length,
        totalSales,
        todaySales: totalSales,
        lowStockProducts: productsList.filter((p: any) => (p.available_stock || 0) <= (p.low_stock_threshold || 5)),
        recentOrders: ordersList.slice(0, 8)
      });
    }

    // B. Products
    if (endpoint === 'admin/products') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const prods = await fetchProductsFromSupabase(env);
          if (prods) return jsonResponse(prods);
        }
        return jsonResponse(state.products);
      }
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        if (isSupabaseConfigured(env)) {
          const sbRes = await saveProductInSupabase(body, env);
          if (sbRes.success) return jsonResponse(sbRes);
          return jsonResponse({ error: sbRes.error || 'Failed to save product to database' }, 500);
        }
        const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const rawSlug = (body.slug || body.name || 'product').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const slug = rawSlug || `product-${Date.now()}`;
        const newProduct = {
          brand: 'ATAL',
          short_description: '',
          description: '',
          variants: [],
          ...body,
          id,
          slug,
          rating: typeof body.rating === 'number' && !isNaN(body.rating) ? body.rating : 5.0,
          reviews_count: typeof body.reviews_count === 'number' && !isNaN(body.reviews_count) ? body.reviews_count : 0,
          purchase_price: Number(body.purchase_price || 0),
          sale_price: Number(body.sale_price || 0),
          original_price: Number(body.original_price || body.sale_price || 0),
          available_stock: Number(body.available_stock || 10),
          low_stock_threshold: Number(body.low_stock_threshold || 5),
          images: Array.isArray(body.images) && body.images.filter(Boolean).length > 0
            ? body.images.filter(Boolean)
            : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
          created_at: new Date().toISOString()
        };
        state.products.unshift(newProduct);
        return jsonResponse({ success: true, id, slug });
      }
    }

    if (endpoint.startsWith('admin/products/')) {
      const sub = endpoint.replace('admin/products/', '');
      if (sub.endsWith('/duplicate') && request.method === 'POST') {
        const origId = sub.replace('/duplicate', '');
        let orig = state.products.find((p: any) => p.id === origId);
        if (isSupabaseConfigured(env)) {
          const allProds = await fetchProductsFromSupabase(env);
          if (allProds) orig = allProds.find((p: any) => p.id === origId);
        }
        if (!orig) return jsonResponse({ error: 'Original product not found' }, 404);
        const id = `prod_${Date.now()}`;
        const slug = `${orig.slug}-copy-${Date.now().toString().slice(-4)}`;
        const copy = { ...orig, id, slug, name: `${orig.name} (Copy)` };
        if (isSupabaseConfigured(env)) {
          const sbRes = await saveProductInSupabase(copy, env);
          if (sbRes.success) return jsonResponse(sbRes);
        }
        state.products.unshift(copy);
        return jsonResponse({ success: true, id, slug });
      }

      const prodId = sub;
      if (request.method === 'PUT') {
        const body = await request.json().catch(() => ({}));
        if (isSupabaseConfigured(env)) {
          const sbRes = await saveProductInSupabase({ ...body, id: prodId }, env);
          if (sbRes.success) return jsonResponse(sbRes);
          return jsonResponse({ error: sbRes.error || 'Failed to update product in database' }, 500);
        }
        const index = state.products.findIndex((p: any) => p.id === prodId);
        if (index >= 0) {
          state.products[index] = { ...state.products[index], ...body, updated_at: new Date().toISOString() };
          return jsonResponse({ success: true, slug: state.products[index].slug });
        }
        return jsonResponse({ error: 'Product not found' }, 404);
      }

      if (request.method === 'DELETE') {
        if (isSupabaseConfigured(env)) {
          const sbRes = await deleteProductInSupabase(prodId, env);
          if (sbRes.success) return jsonResponse({ success: true });
          return jsonResponse({ error: sbRes.error || 'Failed to delete product from database' }, 500);
        }
        const index = state.products.findIndex((p: any) => p.id === prodId);
        if (index >= 0) {
          state.products.splice(index, 1);
          return jsonResponse({ success: true });
        }
        return jsonResponse({ error: 'Product not found' }, 404);
      }
    }

    // C. Categories
    if (endpoint === 'admin/categories') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const cats = await fetchCategoriesFromSupabase(env);
          if (cats) return jsonResponse(cats);
        }
        return jsonResponse(state.categories);
      }
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        if (isSupabaseConfigured(env)) {
          const sbRes = await saveCategoryInSupabase(body, env);
          if (sbRes.success) return jsonResponse(sbRes);
          return jsonResponse({ error: sbRes.error || 'Failed to save category to database' }, 500);
        }
        const id = `cat_${Date.now()}`;
        const slug = (body.name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const cat = { ...body, id, slug };
        state.categories.push(cat);
        return jsonResponse({ success: true, id, slug });
      }
    }

    if (endpoint.startsWith('admin/categories/')) {
      const catId = endpoint.replace('admin/categories/', '');
      if (request.method === 'PUT') {
        const body = await request.json().catch(() => ({}));
        if (isSupabaseConfigured(env)) {
          const sbRes = await saveCategoryInSupabase({ ...body, id: catId }, env);
          if (sbRes.success) return jsonResponse(sbRes);
          return jsonResponse({ error: sbRes.error || 'Failed to update category' }, 500);
        }
        const idx = state.categories.findIndex((c: any) => c.id === catId);
        if (idx >= 0) {
          state.categories[idx] = { ...state.categories[idx], ...body };
          return jsonResponse({ success: true, slug: state.categories[idx].slug });
        }
        return jsonResponse({ error: 'Category not found' }, 404);
      }
      if (request.method === 'DELETE') {
        if (isSupabaseConfigured(env)) {
          const sbRes = await deleteCategoryInSupabase(catId, env);
          if (sbRes.success) return jsonResponse({ success: true });
          return jsonResponse({ error: sbRes.error || 'Failed to delete category' }, 400);
        }
        const inUse = state.products.some((p: any) => p.category_id === catId);
        if (inUse) {
          return jsonResponse({ error: 'Cannot delete category: Contains assigned products.' }, 400);
        }
        const idx = state.categories.findIndex((c: any) => c.id === catId);
        if (idx >= 0) state.categories.splice(idx, 1);
        return jsonResponse({ success: true });
      }
    }

    // D. Orders
    if (endpoint === 'admin/orders') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const orders = await fetchOrdersFromSupabase(env);
          if (orders) return jsonResponse(orders);
        }
        return jsonResponse(state.orders);
      }
    }
    if (endpoint.startsWith('admin/orders/') && request.method === 'PUT') {
      const orderId = endpoint.replace('admin/orders/', '');
      const body = await request.json().catch(() => ({}));
      if (isSupabaseConfigured(env)) {
        const ok = await updateOrderStatusInSupabase(orderId, body, env);
        if (ok) return jsonResponse({ success: true });
      }
      const ord = state.orders.find((o: any) => o.id === orderId);
      if (ord) {
        Object.assign(ord, body);
        return jsonResponse({ success: true });
      }
      return jsonResponse({ error: 'Order not found' }, 404);
    }

    // E. Banners
    if (endpoint === 'admin/banners') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const banners = await fetchBannersFromSupabase(env);
          if (banners) return jsonResponse(banners);
        }
        return jsonResponse(state.banners);
      }
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        if (isSupabaseConfigured(env)) {
          const sbRes = await saveBannerInSupabase(body, env);
          if (sbRes.success) return jsonResponse(sbRes);
        }
        const id = `ban_${Date.now()}`;
        state.banners.push({ ...body, id });
        return jsonResponse({ success: true, id });
      }
    }
    if (endpoint.startsWith('admin/banners/')) {
      const banId = endpoint.replace('admin/banners/', '');
      if (request.method === 'PUT') {
        const body = await request.json().catch(() => ({}));
        if (isSupabaseConfigured(env)) {
          const sbRes = await saveBannerInSupabase({ ...body, id: banId }, env);
          if (sbRes.success) return jsonResponse({ success: true });
        }
        const idx = state.banners.findIndex((b: any) => b.id === banId);
        if (idx >= 0) Object.assign(state.banners[idx], body);
        return jsonResponse({ success: true });
      }
      if (request.method === 'DELETE') {
        if (isSupabaseConfigured(env)) {
          const sbRes = await deleteBannerInSupabase(banId, env);
          if (sbRes.success) return jsonResponse({ success: true });
        }
        const idx = state.banners.findIndex((b: any) => b.id === banId);
        if (idx >= 0) state.banners.splice(idx, 1);
        return jsonResponse({ success: true });
      }
    }

    // F. Homepage Sections
    if (endpoint === 'admin/homepage') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const sections = await fetchSectionsFromSupabase(env);
          if (sections) return jsonResponse(sections);
        }
        return jsonResponse(state.homepage_sections);
      }
      if (request.method === 'PUT') {
        const { sections } = await request.json().catch(() => ({}));
        if (Array.isArray(sections)) {
          if (isSupabaseConfigured(env)) {
            await saveSectionsInSupabase(sections, env);
          }
          state.homepage_sections = sections;
          return jsonResponse({ success: true, message: 'Homepage sections updated.' });
        }
        return jsonResponse({ error: 'Sections array required' }, 400);
      }
    }

    // G. Launch Soon
    if (endpoint === 'admin/launch-soon') {
      if (request.method === 'GET') return jsonResponse(state.launch_soon);
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const id = `ls_${Date.now()}`;
        state.launch_soon.push({ ...body, id });
        return jsonResponse({ success: true, id });
      }
    }
    if (endpoint.startsWith('admin/launch-soon/')) {
      const lsId = endpoint.replace('admin/launch-soon/', '');
      const idx = state.launch_soon.findIndex((l: any) => l.id === lsId);
      if (request.method === 'PUT') {
        const body = await request.json().catch(() => ({}));
        if (idx >= 0) Object.assign(state.launch_soon[idx], body);
        return jsonResponse({ success: true });
      }
      if (request.method === 'DELETE') {
        if (idx >= 0) state.launch_soon.splice(idx, 1);
        return jsonResponse({ success: true });
      }
    }

    // H. Coupons
    if (endpoint === 'admin/coupons') {
      if (request.method === 'GET') return jsonResponse(state.coupons);
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const id = `cp_${Date.now()}`;
        state.coupons.push({ ...body, id, code: String(body.code).toUpperCase() });
        return jsonResponse({ success: true, id });
      }
    }
    if (endpoint.startsWith('admin/coupons/') && request.method === 'DELETE') {
      const cpId = endpoint.replace('admin/coupons/', '');
      const idx = state.coupons.findIndex((c: any) => c.id === cpId);
      if (idx >= 0) state.coupons.splice(idx, 1);
      return jsonResponse({ success: true });
    }

    // I. Settings
    if (endpoint === 'admin/settings') {
      if (request.method === 'GET') {
        if (isSupabaseConfigured(env)) {
          const sbSettings = await fetchSettingsFromSupabase(env);
          if (sbSettings) return jsonResponse(sbSettings);
        }
        return jsonResponse(state.settings);
      }
      if (request.method === 'PUT') {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return jsonResponse({ error: 'Invalid JSON payload: Object required' }, 400);
        }
        if (isSupabaseConfigured(env)) {
          await updateSettingsInSupabase(body, env);
        }
        for (const [k, v] of Object.entries(body)) {
          if (typeof k === 'string' && k.trim().length > 0) {
            state.settings[k] = String(v ?? '');
          }
        }
        return jsonResponse({ success: true, message: 'Settings saved permanently.' });
      }
    }

    // J. Staff & Passwords
    if (endpoint === 'admin/staff' && request.method === 'GET') {
      return jsonResponse(state.staff);
    }

    if (endpoint === 'admin/staff/update-password' && request.method === 'POST') {
      try {
        const { user_id, new_password } = await request.json().catch(() => ({}));
        if (!user_id || !new_password || String(new_password).trim().length < 4) {
          return jsonResponse({ error: 'Valid user ID and new password (min 4 characters) are required.' }, 400);
        }
        const target = state.staff.find((s: any) => s.id === user_id);
        if (!target) return jsonResponse({ error: 'Staff account not found' }, 404);

        if (!(globalThis as any).__ATAL_STAFF_PASSWORDS__) {
          (globalThis as any).__ATAL_STAFF_PASSWORDS__ = { 'uatal.pk@gmail.com': 'Umer@9157', 'ali@atal.com': 'Ali@297' };
        }
        (globalThis as any).__ATAL_STAFF_PASSWORDS__[target.email] = String(new_password).trim();
        return jsonResponse({ success: true, message: `Password successfully updated for ${target.email}` });
      } catch (err: any) {
        return jsonResponse({ error: err?.message || 'Password update failed' }, 500);
      }
    }

    if (endpoint === 'admin/staff/reset-defaults' && request.method === 'POST') {
      (globalThis as any).__ATAL_STAFF_PASSWORDS__ = {
        'uatal.pk@gmail.com': 'Umer@9157',
        'ali@atal.com': 'Ali@297'
      };
      return jsonResponse({
        success: true,
        message: 'Default passwords restored: Admin (uatal.pk@gmail.com -> Umer@9157) & Employee (ali@atal.com -> Ali@297).'
      });
    }

    // K. Backup Export & Import
    if (endpoint === 'admin/backup/export' && request.method === 'GET') {
      let currentSettings = state.settings;
      let currentCategories = state.categories;
      let currentProducts = state.products;
      let currentBanners = state.banners;
      let currentSections = state.homepage_sections;

      if (isSupabaseConfigured(env)) {
        currentSettings = (await fetchSettingsFromSupabase(env)) || currentSettings;
        currentCategories = (await fetchCategoriesFromSupabase(env)) || currentCategories;
        currentProducts = (await fetchProductsFromSupabase(env)) || currentProducts;
        currentBanners = (await fetchBannersFromSupabase(env)) || currentBanners;
        currentSections = (await fetchSectionsFromSupabase(env)) || currentSections;
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
        launch_soon: state.launch_soon,
        coupons: state.coupons
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

        if (isSupabaseConfigured(env)) {
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
        }

        if (Array.isArray(backupData.categories)) state.categories = backupData.categories;
        if (Array.isArray(backupData.products)) state.products = backupData.products;
        if (Array.isArray(backupData.banners)) state.banners = backupData.banners;
        if (Array.isArray(backupData.settings)) {
          for (const s of backupData.settings) {
            if (s.key) state.settings[s.key] = String(s.value ?? '');
          }
        }
        return jsonResponse({ success: true, message: 'Backup imported successfully.', recordsRestored: preview });
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
