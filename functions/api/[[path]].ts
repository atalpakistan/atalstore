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

// Core Default Settings
const DEFAULT_SETTINGS = {
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

export const onRequest = async ({ request, params }: { request: Request; params: { path?: string[] } }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const pathParts = params.path || url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const endpoint = pathParts.join('/');

  // 1. /api/config
  if (endpoint === 'config' && request.method === 'GET') {
    return jsonResponse(DEFAULT_SETTINGS);
  }

  // 2. /api/homepage
  if (endpoint === 'homepage' && request.method === 'GET') {
    return jsonResponse({
      settings: DEFAULT_SETTINGS,
      sections: [
        { section_key: 'carousel', title: 'Featured Promotions', subtitle: 'Exclusive seasonal highlights', is_enabled: 1, display_order: 1, layout: 'carousel' },
        { section_key: 'categories', title: 'Shop by Category', subtitle: 'Explore curated Pakistani collections', is_enabled: 1, display_order: 2, layout: 'horizontal_row' },
        { section_key: 'festive_deals', title: '⚡ Featured Festive Deals', subtitle: 'Exclusive limited-time savings across Pakistan', is_enabled: 1, display_order: 3, layout: 'carousel' },
        { section_key: 'spotlight', title: 'Spotlight Products', subtitle: 'Handcrafted precision and luxury picks', is_enabled: 1, display_order: 4, layout: 'featured_split' },
        { section_key: 'all_products', title: 'Shop All Products', subtitle: 'Browse our comprehensive verified catalog', is_enabled: 1, display_order: 5, layout: 'grid' },
        { section_key: 'new_launch', title: 'New Launch', subtitle: 'Freshly arrived this week in store', is_enabled: 1, display_order: 6, layout: 'carousel' },
        { section_key: 'launch_soon', title: 'Launch Soon', subtitle: 'Upcoming drops with priority notifications', is_enabled: 1, display_order: 7, layout: 'carousel' },
      ],
      banners: [
        { id: 'ban_01', title: 'FESTIVE EID & WEDDING COLLECTION', subtitle: 'Handcrafted Pakistani luxury kurtas, sherwanis, and lawn ensembles.', image_url: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1600&q=80', cta_text: 'Explore Festive Deals', cta_url: '/category/men', display_order: 1, is_active: 1 },
        { id: 'ban_02', title: 'ATAL AUDIOPHILE PRO SERIES', subtitle: 'Wireless Active Noise Cancellation designed for Pakistani professionals.', image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80', cta_text: 'Shop Electronics', cta_url: '/category/electronics', display_order: 2, is_active: 1 },
        { id: 'ban_03', title: 'DAMASCUS ROSE & OUD COUTURE', subtitle: 'Pure essential elixirs and oriental fragrances distilled for royalty.', image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1600&q=80', cta_text: 'Discover Perfumes', cta_url: '/category/cosmetics-perfume', display_order: 3, is_active: 1 },
      ],
      categories: DEFAULT_CATEGORIES,
      festive_deals: [],
      spotlight_products: [],
      new_launches: [],
      launch_soon: [],
      catalog_sample: [],
    });
  }

  // 3. /api/categories
  if (endpoint === 'categories' && request.method === 'GET') {
    return jsonResponse(DEFAULT_CATEGORIES);
  }

  // 4. /api/admin/metrics
  if (endpoint === 'admin/metrics' && request.method === 'GET') {
    return jsonResponse({
      totalOrders: 0,
      todayOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalSales: 0,
      todaySales: 0,
      lowStockProducts: [],
      recentOrders: [],
    });
  }

  // 5. /api/admin/products
  if (endpoint === 'admin/products') {
    if (request.method === 'GET') return jsonResponse([]);
    if (request.method === 'POST') return jsonResponse({ success: true, id: `prod_${Date.now()}` });
  }

  // 6. /api/admin/orders
  if (endpoint === 'admin/orders' && request.method === 'GET') {
    return jsonResponse([]);
  }

  // 7. /api/admin/staff
  if (endpoint === 'admin/staff' && request.method === 'GET') {
    return jsonResponse([
      { id: 'usr_admin_uatal', email: 'uatal.pk@gmail.com', full_name: 'Umer (Administrator)', phone: '03719150297', role: 'admin' },
      { id: 'usr_emp_ali', email: 'ali@atal.com', full_name: 'Ali (Store Manager)', phone: '03719150297', role: 'employee' },
    ]);
  }

  // Unmatched API fallback JSON 404
  return jsonResponse({ error: `API route not found: ${request.method} ${url.pathname}` }, 404);
};
