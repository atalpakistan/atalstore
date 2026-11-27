import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to resolve env vars across Node.js (process.env) and Cloudflare Pages (env object)
export function getEnvVar(name: string, envObj?: any): string | undefined {
  const viteKey = `VITE_${name}`;
  if (envObj) {
    if (typeof envObj[name] === 'string' && envObj[name].trim()) return envObj[name].trim();
    if (typeof envObj[viteKey] === 'string' && envObj[viteKey].trim()) return envObj[viteKey].trim();
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[name] && process.env[name]!.trim()) return process.env[name]!.trim();
    if (process.env[viteKey] && process.env[viteKey]!.trim()) return process.env[viteKey]!.trim();
  }
  return undefined;
}

export function cleanSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  let url = rawUrl.trim();
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

export function getSupabaseClient(envObj?: any): SupabaseClient | null {
  const rawUrl = getEnvVar('SUPABASE_URL', envObj);
  const url = cleanSupabaseUrl(rawUrl);
  const key =
    getEnvVar('SUPABASE_SERVICE_ROLE_KEY', envObj) ||
    getEnvVar('SUPABASE_ANON_KEY', envObj);

  if (!url || !key) {
    return null;
  }

  try {
    return createClient(url, key, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export function isSupabaseConfigured(envObj?: any): boolean {
  return Boolean(getSupabaseClient(envObj));
}

// Diagnostic helper to inspect Supabase connectivity and tables
export async function getSupabaseDiagnostics(envObj?: any): Promise<{
  configured: boolean;
  status: 'connected' | 'missing_config' | 'error';
  url: string | null;
  hasKey: boolean;
  keyType: 'service_role' | 'anon' | 'none';
  tables: { settings: boolean; products: boolean; categories: boolean; orders: boolean };
  error?: string;
}> {
  const url = getEnvVar('SUPABASE_URL', envObj);
  const serviceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', envObj);
  const anonKey = getEnvVar('SUPABASE_ANON_KEY', envObj);
  const hasKey = Boolean(serviceKey || anonKey);
  const keyType = serviceKey ? 'service_role' : anonKey ? 'anon' : 'none';

  if (!url || !hasKey) {
    return {
      configured: false,
      status: 'missing_config',
      url: url ? url.slice(0, 16) + '...' : null,
      hasKey,
      keyType,
      tables: { settings: false, products: false, categories: false, orders: false },
      error: 'SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) are not configured.',
    };
  }

  const client = getSupabaseClient(envObj);
  if (!client) {
    return {
      configured: false,
      status: 'error',
      url: url.slice(0, 16) + '...',
      hasKey,
      keyType,
      tables: { settings: false, products: false, categories: false, orders: false },
      error: 'Failed to initialize Supabase client instance.',
    };
  }

  try {
    const [sRes, pRes, cRes, oRes] = await Promise.all([
      client.from('settings').select('key').limit(1),
      client.from('products').select('id').limit(1),
      client.from('categories').select('id').limit(1),
      client.from('orders').select('id').limit(1),
    ]);

    const hasAnyError = sRes.error || pRes.error || cRes.error || oRes.error;
    const cleanUrl = url.replace(/^https?:\/\//, '').split('.')[0] + '.supabase.co';

    return {
      configured: true,
      status: hasAnyError ? 'error' : 'connected',
      url: cleanUrl,
      hasKey: true,
      keyType,
      tables: {
        settings: !sRes.error,
        products: !pRes.error,
        categories: !cRes.error,
        orders: !oRes.error,
      },
      error: hasAnyError
        ? sRes.error?.message || pRes.error?.message || cRes.error?.message || oRes.error?.message
        : undefined,
    };
  } catch (err: any) {
    return {
      configured: true,
      status: 'error',
      url: url ? url.slice(0, 16) + '...' : null,
      hasKey: true,
      keyType,
      tables: { settings: false, products: false, categories: false, orders: false },
      error: err?.message || 'Database connection error',
    };
  }
}

// -------------------------------------------------------------------
// 1. SETTINGS CRUD
// -------------------------------------------------------------------

const NUMERIC_SUPABASE_SETTING_KEYS = new Set([
  'free_shipping_threshold',
  'default_shipping_fee',
  'min_order_amount',
  'header_logo_height',
]);

export async function fetchSettingsFromSupabase(envObj?: any): Promise<Record<string, any> | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client.from('settings').select('key, value');
  if (error || !data) {
    console.error('Supabase fetchSettings error:', error);
    return null;
  }

  const settings: Record<string, any> = {};
  for (const r of data) {
    if (r.value === 'true') settings[r.key] = true;
    else if (r.value === 'false') settings[r.key] = false;
    else if (NUMERIC_SUPABASE_SETTING_KEYS.has(r.key) && !isNaN(Number(r.value)) && r.value.trim() !== '') {
      settings[r.key] = Number(r.value);
    } else {
      settings[r.key] = String(r.value ?? '');
    }
  }
  return settings;
}

export async function updateSettingsInSupabase(
  settings: Record<string, any>,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const rows = Object.entries(settings)
    .filter(([k]) => typeof k === 'string' && k.trim().length > 0)
    .map(([key, val]) => ({
      key,
      value: String(val ?? ''),
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return { success: true };

  const { error } = await client.from('settings').upsert(rows, { onConflict: 'key' });
  if (error) {
    console.error('Supabase updateSettings error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// -------------------------------------------------------------------
// 2. CATEGORIES CRUD
// -------------------------------------------------------------------

export async function fetchCategoriesFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data: cats, error } = await client
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error || !cats) {
    console.error('Supabase fetchCategories error:', error);
    return null;
  }

  for (const cat of cats) {
    const { data: subs } = await client
      .from('subcategories')
      .select('*')
      .eq('category_id', cat.id)
      .order('display_order', { ascending: true });
    cat.subcategories = subs || [];
    const { count } = await client
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', cat.id);
    cat.product_count = count || 0;
  }
  return cats;
}

export async function saveCategoryInSupabase(
  category: any,
  envObj?: any
): Promise<{ success: boolean; id?: string; slug?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const id = category.id || `cat_${Date.now()}`;
  let slug = (category.slug || category.name || 'category')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) slug = `category-${Date.now()}`;

  // Check for duplicate slug on other categories
  const { data: dupCat } = await client
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .neq('id', id)
    .maybeSingle();

  if (dupCat) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const row = {
    id,
    name: category.name,
    slug,
    icon: category.icon || 'Sparkles',
    image: category.image || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80',
    description: category.description || '',
    display_order: Number(category.display_order || 0),
  };

  const { error } = await client.from('categories').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('Supabase saveCategory error:', error);
    return { success: false, error: error.message };
  }

  // Handle subcategories
  if (category.subcategories && Array.isArray(category.subcategories)) {
    await client.from('subcategories').delete().eq('category_id', id);
    if (category.subcategories.length > 0) {
      const subRows = category.subcategories.map((sc: any, idx: number) => {
        const scName = typeof sc === 'string' ? sc : sc.name || 'Subcategory';
        const scSlug = typeof sc === 'object' && sc.slug
          ? sc.slug
          : scName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const scId = typeof sc === 'object' && sc.id ? sc.id : `sub_${id}_${idx + 1}`;
        return {
          id: scId,
          category_id: id,
          name: scName,
          slug: scSlug || `sub-${Date.now()}-${idx}`,
          display_order: typeof sc === 'object' && sc.display_order !== undefined ? Number(sc.display_order) : idx + 1,
        };
      });
      await client.from('subcategories').insert(subRows);
    }
  }

  return { success: true, id, slug };
}

export async function deleteCategoryInSupabase(
  id: string,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const { count } = await client
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete category: Contains ${count} assigned products. Reassign or delete those products first.`,
    };
  }

  // Delete subcategories first
  await client.from('subcategories').delete().eq('category_id', id);

  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) {
    console.error('Supabase deleteCategory error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// -------------------------------------------------------------------
// 3. PRODUCTS CRUD
// -------------------------------------------------------------------

export async function fetchProductsFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data: prods, error } = await client
    .from('products')
    .select('*, categories(name, slug)')
    .order('created_at', { ascending: false });

  if (error || !prods) {
    console.error('Supabase fetchProducts error:', error);
    return null;
  }

  for (const p of prods) {
    const { data: vars } = await client.from('product_variants').select('*').eq('product_id', p.id);
    p.variants = vars || [];
    if (p.categories) {
      p.category_name = p.categories.name;
      p.category_slug = p.categories.slug;
    }
    if (p.subcategory_id) {
      const { data: subData } = await client.from('subcategories').select('name, slug').eq('id', p.subcategory_id).maybeSingle();
      if (subData) {
        p.subcategory_name = subData.name;
        p.subcategory_slug = subData.slug;
      }
    }
    if (typeof p.images === 'string') {
      try {
        p.images = JSON.parse(p.images);
      } catch {
        p.images = [p.images];
      }
    }
    if (!Array.isArray(p.images) || p.images.length === 0) {
      p.images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];
    }
  }

  return prods;
}

export async function fetchProductBySlugOrIdFromSupabase(
  slugOrId: string,
  envObj?: any
): Promise<{ product: any; related: any[] } | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client
    .from('products')
    .select('*, categories(name, slug)')
    .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
    .maybeSingle();

  if (error || !data) return null;

  const { data: vars } = await client.from('product_variants').select('*').eq('product_id', data.id);
  data.variants = vars || [];
  if (data.categories) {
    data.category_name = data.categories.name;
    data.category_slug = data.categories.slug;
  }
  if (typeof data.images === 'string') {
    try {
      data.images = JSON.parse(data.images);
    } catch {
      data.images = [data.images];
    }
  }
  if (!Array.isArray(data.images) || data.images.length === 0) {
    data.images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];
  }
  data.rating = typeof data.rating === 'number' && !isNaN(data.rating) ? data.rating : 5.0;
  data.reviews_count = typeof data.reviews_count === 'number' && !isNaN(data.reviews_count) ? data.reviews_count : 0;

  const { data: relRaw } = await client
    .from('products')
    .select('*')
    .eq('category_id', data.category_id)
    .neq('id', data.id)
    .limit(4);

  const related = (relRaw || []).map((r: any) => {
    if (typeof r.images === 'string') {
      try {
        r.images = JSON.parse(r.images);
      } catch {
        r.images = [r.images];
      }
    }
    if (!Array.isArray(r.images) || r.images.length === 0) {
      r.images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];
    }
    r.sale_price = typeof r.sale_price === 'number' ? r.sale_price : 0;
    return r;
  });

  return { product: data, related };
}

export async function saveProductInSupabase(
  p: any,
  envObj?: any
): Promise<{ success: boolean; id?: string; slug?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const id = p.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let rawSlug = (p.slug || p.name || 'product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  let slug = rawSlug || `product-${Date.now()}`;

  // Check for unique slug constraint collision with other products
  const { data: existingSlugProd } = await client
    .from('products')
    .select('id, slug')
    .eq('slug', slug)
    .neq('id', id)
    .maybeSingle();

  if (existingSlugProd) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const sku = p.sku || `ATAL-${slug.toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-3)}`;

  const imagesArr = Array.isArray(p.images) && p.images.filter(Boolean).length > 0
    ? p.images.filter(Boolean)
    : typeof p.images === 'string' && p.images.trim()
      ? [p.images.trim()]
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];

  const row = {
    id,
    name: p.name,
    slug,
    sku,
    brand: p.brand || 'ATAL',
    category_id: p.category_id,
    subcategory_id: p.subcategory_id || null,
    short_description: p.short_description || '',
    description: p.description || '',
    images: imagesArr,
    purchase_price: Number(p.purchase_price || 0),
    original_price: Number(p.original_price || p.sale_price || 0),
    sale_price: Number(p.sale_price || 0),
    currency: p.currency || 'PKR',
    available_stock: Number(p.available_stock ?? 10),
    low_stock_threshold: Number(p.low_stock_threshold ?? 5),
    weight: Number(p.weight || 0),
    dimensions: p.dimensions || '',
    shipping_requirements: p.shipping_requirements || '',
    seo_title: p.seo_title || p.name,
    seo_description: p.seo_description || p.short_description || '',
    new_launch: p.new_launch ? 1 : 0,
    spotlight: p.spotlight ? 1 : 0,
    festive_deal: p.festive_deal ? 1 : 0,
    festive_deal_order: Number(p.festive_deal_order || 0),
    spotlight_order: Number(p.spotlight_order || 0),
    new_launch_order: Number(p.new_launch_order || 0),
    rating: typeof p.rating === 'number' && !isNaN(p.rating) ? p.rating : 5.0,
    reviews_count: typeof p.reviews_count === 'number' && !isNaN(p.reviews_count) ? p.reviews_count : 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('products').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('Supabase saveProduct error:', error);
    return { success: false, error: error.message };
  }

  // Handle variants
  if (p.variants && Array.isArray(p.variants)) {
    await client.from('product_variants').delete().eq('product_id', id);
    if (p.variants.length > 0) {
      const varRows = p.variants.map((v: any, idx: number) => ({
        id: v.id || `var_${id}_${idx + 1}`,
        product_id: id,
        color_name: v.color_name || null,
        color_code: v.color_code || null,
        size: v.size || null,
        sku: v.sku || `${sku}-V${idx + 1}`,
        price: Number(v.price || p.sale_price || 0),
        stock: Number(v.stock || 0),
        image_url: v.image_url || null,
      }));
      await client.from('product_variants').insert(varRows);
    }
  }

  return { success: true, id, slug };
}

export async function deleteProductInSupabase(
  id: string,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  // Delete product variants
  await client.from('product_variants').delete().eq('product_id', id);

  const { error } = await client.from('products').delete().eq('id', id);
  if (error) {
    console.error('Supabase deleteProduct error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// -------------------------------------------------------------------
// 4. BANNERS CRUD
// -------------------------------------------------------------------

export async function fetchBannersFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client
    .from('banners')
    .select('*')
    .order('display_order', { ascending: true });

  if (error || !data) {
    console.error('Supabase fetchBanners error:', error);
    return null;
  }
  return data;
}

export async function saveBannerInSupabase(
  banner: any,
  envObj?: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const id = banner.id || `ban_${Date.now()}`;
  const row = {
    id,
    title: banner.title,
    subtitle: banner.subtitle || '',
    image_url: banner.image_url,
    cta_text: banner.cta_text || 'Shop Now',
    cta_url: banner.cta_url || '/',
    display_order: Number(banner.display_order || 1),
    is_active: banner.is_active ?? 1,
  };

  const { error } = await client.from('banners').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('Supabase saveBanner error:', error);
    return { success: false, error: error.message };
  }
  return { success: true, id };
}

export async function deleteBannerInSupabase(
  id: string,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const { error } = await client.from('banners').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -------------------------------------------------------------------
// 5. HOMEPAGE SECTIONS
// -------------------------------------------------------------------

export async function fetchSectionsFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client
    .from('homepage_sections')
    .select('*')
    .order('display_order', { ascending: true });

  if (error || !data) return null;
  return data;
}

export async function saveSectionsInSupabase(
  sections: any[],
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const rows = sections.map((s, idx) => ({
    section_key: s.section_key,
    title: s.title,
    subtitle: s.subtitle || '',
    is_enabled: s.is_enabled ?? 1,
    display_order: s.display_order ?? idx + 1,
    layout: s.layout || 'carousel',
    max_items: Number(s.max_items || 12),
  }));

  const { error } = await client.from('homepage_sections').upsert(rows, { onConflict: 'section_key' });
  if (error) {
    console.error('Supabase saveSections error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// -------------------------------------------------------------------
// 6. LAUNCH SOON (UPCOMING DROPS) CRUD
// -------------------------------------------------------------------

export async function fetchLaunchSoonFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client
    .from('launch_soon')
    .select('*')
    .order('display_order', { ascending: true });

  if (error || !data) return null;
  return data;
}

export async function saveLaunchSoonInSupabase(
  item: any,
  envObj?: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const id = item.id || `ls_${Date.now()}`;
  const slug = (item.slug || item.product_name || 'launch')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const row = {
    id,
    product_name: item.product_name,
    slug: slug || `launch-${Date.now()}`,
    short_description: item.short_description || '',
    image_url: item.image_url,
    expected_launch_date: item.expected_launch_date || 'Coming Soon',
    countdown_target: item.countdown_target || null,
    coming_soon_badge: item.coming_soon_badge || 'Coming Soon',
    display_order: Number(item.display_order || 0),
    is_active: item.is_active ?? 1,
  };

  const { error } = await client.from('launch_soon').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('Supabase saveLaunchSoon error:', error);
    return { success: false, error: error.message };
  }
  return { success: true, id };
}

export async function deleteLaunchSoonInSupabase(
  id: string,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const { error } = await client.from('launch_soon').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -------------------------------------------------------------------
// 7. COUPONS CRUD
// -------------------------------------------------------------------

export async function fetchCouponsFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return null;
  return data;
}

export async function saveCouponInSupabase(
  coupon: any,
  envObj?: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const id = coupon.id || `cp_${Date.now()}`;
  const row: Record<string, any> = {
    id,
    code: String(coupon.code || '').trim().toUpperCase(),
    discount_type: coupon.discount_type || 'percentage',
    discount_value: Number(coupon.discount_value || 0),
    min_order_amount: Number(coupon.min_order_amount || 0),
    max_discount: coupon.max_discount !== undefined && coupon.max_discount !== null && coupon.max_discount !== '' ? Number(coupon.max_discount) : null,
    usage_limit: coupon.usage_limit !== undefined && coupon.usage_limit !== null && coupon.usage_limit !== '' ? Number(coupon.usage_limit) : null,
    usage_count: Number(coupon.usage_count || 0),
    is_active: coupon.is_active ?? 1,
    expires_at: coupon.expires_at || null,
  };

  const { error } = await client.from('coupons').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('Supabase saveCoupon error:', error);
    return { success: false, error: error.message };
  }
  return { success: true, id };
}

export async function deleteCouponInSupabase(
  id: string,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const { error } = await client.from('coupons').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -------------------------------------------------------------------
// 8. ORDERS CRUD
// -------------------------------------------------------------------

export async function fetchOrdersFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data: orders, error } = await client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !orders) return null;

  for (const o of orders) {
    const { data: items } = await client.from('order_items').select('*').eq('order_id', o.id);
    o.items = items || [];

    // Ensure financial fields are strictly numeric
    let computedSubtotal = 0;
    for (const it of o.items) {
      it.price = Number(it.price || 0);
      it.quantity = Math.max(1, Number(it.quantity || 1));
      it.total = it.price * it.quantity;
      computedSubtotal += it.total;
    }

    o.subtotal = Number(o.subtotal) > 0 ? Number(o.subtotal) : computedSubtotal;
    o.discount = Number(o.discount || 0);
    o.shipping_fee = Number(o.shipping_fee !== undefined ? o.shipping_fee : 290);
    o.total_amount = Number(o.total_amount) > 0 ? Number(o.total_amount) : Math.max(0, o.subtotal - o.discount + o.shipping_fee);
  }
  return orders;
}

export async function updateOrderStatusInSupabase(
  id: string,
  body: any,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.order_status) updates.order_status = body.order_status;
  if (body.payment_status) updates.payment_status = body.payment_status;
  if (body.tracking_number !== undefined) updates.tracking_number = body.tracking_number;
  if (body.tracking_courier !== undefined) updates.tracking_courier = body.tracking_courier;
  if (body.transaction_id !== undefined) {
    updates.transaction_id = body.transaction_id;
    updates.transaction_ref = body.transaction_id;
  }
  if (body.transaction_ref !== undefined && !updates.transaction_id) {
    updates.transaction_id = body.transaction_ref;
    updates.transaction_ref = body.transaction_ref;
  }

  const { error } = await client.from('orders').update(updates).eq('id', id);
  if (error) {
    console.error('Supabase updateOrderStatus error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function createOrderInSupabase(
  body: any,
  envObj?: any
): Promise<{ success: boolean; order?: any; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const cleanPhone = String(body.phone || '').replace(/[\s-]/g, '');
  const pkPhoneRegex = /^(\+92|0092|92|0)?3[0-9]{9}$/;
  if (!cleanPhone || !pkPhoneRegex.test(cleanPhone)) {
    return { success: false, error: 'Please enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567)' };
  }

  if (!body.customer_name || !body.province || !body.city || !body.street_address || !Array.isArray(body.items) || body.items.length === 0) {
    return { success: false, error: 'Missing required shipping information or empty order items' };
  }

  const allowedPaymentMethods = new Set(['cod', 'jazzcash', 'easypaisa']);
  const paymentMethod = String(body.payment_method || 'cod').toLowerCase();
  if (!allowedPaymentMethods.has(paymentMethod)) {
    return { success: false, error: 'Unsupported payment method selected.' };
  }

  const sbSettings = (await fetchSettingsFromSupabase(envObj)) || {};
  if (paymentMethod === 'cod' && sbSettings.cod_enabled === false) {
    return { success: false, error: 'Cash on Delivery (COD) is currently disabled by the store administrator.' };
  }
  if (paymentMethod === 'jazzcash' && sbSettings.jazzcash_enabled === false) {
    return { success: false, error: 'JazzCash is currently disabled by the store administrator.' };
  }
  if (paymentMethod === 'easypaisa' && sbSettings.easypaisa_enabled === false) {
    return { success: false, error: 'Easypaisa is currently disabled by the store administrator.' };
  }

  const isAdvanceMandatory = sbSettings.delivery_advance_mandatory !== false;
  const requiresTxId = paymentMethod !== 'cod' || isAdvanceMandatory;
  const cleanTxId = String(body.transaction_id || body.transaction_ref || '').trim();
  if (requiresTxId && !cleanTxId) {
    return {
      success: false,
      error: paymentMethod === 'cod'
        ? 'Transaction ID / Receipt Number for advance shipping payment is required.'
        : 'Transaction ID / Receipt Number is mandatory for this payment option.',
    };
  }

  let subtotal = 0;
  const verifiedItems: Array<{
    product_id: string;
    product_name: string;
    variant_id: string | null;
    variant_title: string | null;
    price: number;
    quantity: number;
    image_url: string;
    total: number;
    product_stock: number;
    product_sku: string;
    low_stock_threshold: number;
    variant_stock: number | null;
  }> = [];

  for (const rawIt of body.items) {
    const pid = rawIt.product_id || rawIt.id;
    const qty = Math.floor(Number(rawIt.quantity));
    if (!pid || !Number.isFinite(qty) || qty < 1) {
      return { success: false, error: 'Each cart item must have a valid product and positive quantity.' };
    }

    const { data: prod, error: prodErr } = await client
      .from('products')
      .select('id, name, sku, sale_price, available_stock, low_stock_threshold, images')
      .or(`id.eq.${pid},slug.eq.${pid}`)
      .maybeSingle();

    if (prodErr || !prod) {
      return { success: false, error: `Product "${pid}" was not found or is no longer available.` };
    }

    let unitPrice = Number(prod.sale_price);
    let variantTitle: string | null = rawIt.variant_title || rawIt.variant_name || null;
    let itemImg = '/icon.svg';
    let parsedImgs: string[] = [];
    if (Array.isArray(prod.images)) parsedImgs = prod.images;
    else if (typeof prod.images === 'string') {
      try {
        const p = JSON.parse(prod.images);
        if (Array.isArray(p)) parsedImgs = p;
      } catch {}
    }
    if (parsedImgs.length > 0 && parsedImgs[0]) itemImg = parsedImgs[0];

    let variantStock: number | null = null;
    const vid = rawIt.variant_id || null;
    if (vid) {
      const { data: variant } = await client
        .from('product_variants')
        .select('*')
        .eq('id', vid)
        .eq('product_id', prod.id)
        .maybeSingle();

      if (!variant) {
        return { success: false, error: `Selected variant for "${prod.name}" is no longer available.` };
      }
      if (variant.price !== undefined && variant.price !== null && Number(variant.price) > 0) {
        unitPrice = Number(variant.price);
      }
      variantTitle = `${variant.color_name || ''} ${variant.size || ''}`.trim() || variantTitle;
      if (variant.image_url) itemImg = variant.image_url;
      variantStock = Number(variant.stock || 0);
      if (variantStock < qty) {
        return { success: false, error: `Insufficient stock for ${prod.name} (${variantTitle}). Only ${variantStock} left.` };
      }
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return { success: false, error: `Product "${prod.name}" has an invalid price.` };
    }

    const currentStock = Number(prod.available_stock ?? 0);
    if (currentStock < qty) {
      return { success: false, error: `Insufficient stock for ${prod.name}. Available: ${currentStock}` };
    }

    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    verifiedItems.push({
      product_id: prod.id,
      product_name: prod.name,
      variant_id: vid,
      variant_title: variantTitle,
      price: unitPrice,
      quantity: qty,
      image_url: itemImg,
      total: lineTotal,
      product_stock: currentStock,
      product_sku: prod.sku || prod.id,
      low_stock_threshold: Number(prod.low_stock_threshold ?? 5),
      variant_stock: variantStock,
    });
  }

  // Validate and compute coupon discount server-side
  let discount = 0;
  if (body.coupon_code) {
    const { data: coupons } = await client
      .from('coupons')
      .select('*')
      .ilike('code', String(body.coupon_code).trim())
      .eq('is_active', 1)
      .limit(1);

    const coupon = coupons?.[0];
    const notExpired = !coupon?.expires_at || new Date(coupon.expires_at).getTime() > Date.now();
    const withinLimit = !coupon?.usage_limit || Number(coupon.usage_count || 0) < Number(coupon.usage_limit);
    const meetsMin = !coupon?.min_order_amount || subtotal >= Number(coupon.min_order_amount);

    if (coupon && notExpired && withinLimit && meetsMin) {
      if (coupon.discount_type === 'percentage') {
        discount = (subtotal * Number(coupon.discount_value || 0)) / 100;
        if (coupon.max_discount && discount > Number(coupon.max_discount)) {
          discount = Number(coupon.max_discount);
        }
      } else {
        discount = Number(coupon.discount_value || 0);
      }
      discount = Math.min(discount, subtotal);
      await client
        .from('coupons')
        .update({ usage_count: Number(coupon.usage_count || 0) + 1 })
        .eq('id', coupon.id);
    }
  }

  const freeThreshold =
    sbSettings.free_shipping_threshold !== undefined && sbSettings.free_shipping_threshold !== null
      ? Number(sbSettings.free_shipping_threshold)
      : 9999;
  const standardShippingFee =
    sbSettings.default_shipping_fee !== undefined && sbSettings.default_shipping_fee !== null
      ? Number(sbSettings.default_shipping_fee)
      : 290;

  const shipping_fee = subtotal >= freeThreshold ? 0 : standardShippingFee;
  const total_amount = Math.max(0, subtotal - discount + shipping_fee);

  const orderId = body.id || Math.floor(100000000 + Math.random() * 900000000).toString();
  const orderRow = {
    id: orderId,
    customer_id: body.customer_id || null,
    customer_name: String(body.customer_name).trim(),
    customer_email: body.customer_email || null,
    phone: cleanPhone,
    province: String(body.province).trim(),
    city: String(body.city).trim(),
    area: String(body.area || body.city || 'Central').trim(),
    street_address: String(body.street_address).trim(),
    landmark: body.landmark || null,
    order_notes: body.order_notes || null,
    subtotal,
    discount,
    shipping_fee,
    total_amount,
    payment_method: paymentMethod,
    payment_status: 'pending',
    order_status: 'Pending',
    transaction_id: cleanTxId || null,
    transaction_ref: cleanTxId || null,
  };

  const { error: ordErr } = await client.from('orders').insert(orderRow);
  if (ordErr) {
    console.error('Supabase createOrder error:', ordErr);
    return { success: false, error: ordErr.message };
  }

  const itemRows = verifiedItems.map((it, idx) => ({
    id: `it_${orderId}_${idx + 1}`,
    order_id: orderId,
    product_id: it.product_id,
    product_name: it.product_name,
    variant_title: it.variant_title,
    price: it.price,
    quantity: it.quantity,
    image_url: it.image_url,
    total: it.total,
  }));
  await client.from('order_items').insert(itemRows);

  // Deduct stock and emit new_order + low_stock notifications
  try {
    await createNotificationInSupabase({
      type: 'new_order',
      title: `🛒 New Order #${orderId}`,
      message: `New order of Rs. ${total_amount.toLocaleString('en-PK')} placed by ${orderRow.customer_name} (${orderRow.phone}).`,
      link: `/admin/orders?order=${orderId}`,
      entity_id: orderId,
    }, envObj);
  } catch (notifErr) {
    console.warn('Notification trigger warning:', notifErr);
  }

  for (const it of verifiedItems) {
    if (it.variant_id && it.variant_stock !== null) {
      const nextVarStock = Math.max(0, it.variant_stock - it.quantity);
      await client.from('product_variants').update({ stock: nextVarStock }).eq('id', it.variant_id);
    }

    const newStock = Math.max(0, it.product_stock - it.quantity);
    await client.from('products').update({ available_stock: newStock }).eq('id', it.product_id);

    if (newStock <= it.low_stock_threshold) {
      try {
        await createNotificationInSupabase({
          type: 'low_stock',
          title: `⚠️ Low Stock Alert: ${it.product_name}`,
          message: `Inventory for "${it.product_name}" (${it.product_sku}) dropped to ${newStock} units (Threshold: ${it.low_stock_threshold}).`,
          link: `/admin/products?search=${encodeURIComponent(it.product_sku || it.product_name)}`,
          entity_id: it.product_id,
        }, envObj);
      } catch (lErr) {
        console.warn('Low stock notification warning:', lErr);
      }
    }
  }

  return { success: true, order: { ...orderRow, orderId, items: itemRows } };
}

// -------------------------------------------------------------------
// 9. NOTIFICATIONS CRUD
// -------------------------------------------------------------------

export async function fetchNotificationsFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return null;
  return data;
}

export async function createNotificationInSupabase(
  notif: {
    type: 'new_order' | 'low_stock' | 'system';
    title: string;
    message: string;
    link?: string;
    entity_id?: string;
  },
  envObj?: any
): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured' };

  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const row = {
    id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    link: notif.link || null,
    entity_id: notif.entity_id || null,
    is_read: 0,
    created_at: new Date().toISOString(),
  };

  const { error } = await client.from('notifications').insert(row);
  if (error) {
    console.error('Supabase createNotification error:', error);
    return { success: false, error: error.message };
  }
  return { success: true, id };
}

export async function markNotificationReadInSupabase(
  id: string,
  envObj?: any
): Promise<{ success: boolean }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false };

  await client.from('notifications').update({ is_read: 1 }).eq('id', id);
  return { success: true };
}

export async function markAllNotificationsReadInSupabase(
  envObj?: any
): Promise<{ success: boolean }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false };

  await client.from('notifications').update({ is_read: 1 }).eq('is_read', 0);
  return { success: true };
}

export async function deleteNotificationInSupabase(
  id: string,
  envObj?: any
): Promise<{ success: boolean }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false };

  await client.from('notifications').delete().eq('id', id);
  return { success: true };
}

// -------------------------------------------------------------------
// 9B. CUSTOMER ORDERS, WISHLIST & REMINDERS
// -------------------------------------------------------------------

export async function fetchCustomerOrdersFromSupabase(
  user: { id: string; email?: string; phone?: string },
  envObj?: any
): Promise<any[] | null> {
  const allOrders = await fetchOrdersFromSupabase(envObj);
  if (!allOrders) return null;

  const cleanUserEmail = (user.email || '').trim().toLowerCase();
  const cleanUserPhone = (user.phone || '').replace(/\D/g, '').slice(-10);

  return allOrders.filter((o: any) => {
    if (o.customer_id && o.customer_id === user.id) return true;
    if (cleanUserEmail && o.customer_email && String(o.customer_email).trim().toLowerCase() === cleanUserEmail) return true;
    if (cleanUserPhone.length > 5 && o.phone) {
      const orderPhone = String(o.phone).replace(/\D/g, '');
      if (orderPhone.includes(cleanUserPhone)) return true;
    }
    return false;
  });
}

export async function fetchWishlistFromSupabase(customerId: string, envObj?: any): Promise<string[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client
    .from('wishlist_items')
    .select('product_id')
    .eq('customer_id', customerId);

  if (error || !data) return [];
  return data.map((r: any) => r.product_id);
}

export async function toggleWishlistInSupabase(
  customerId: string,
  productId: string,
  envObj?: any
): Promise<{ inWishlist: boolean } | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data: existing } = await client
    .from('wishlist_items')
    .select('id')
    .eq('customer_id', customerId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    await client.from('wishlist_items').delete().eq('customer_id', customerId).eq('product_id', productId);
    return { inWishlist: false };
  }

  const id = `wish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await client.from('wishlist_items').insert({ id, customer_id: customerId, product_id: productId });
  return { inWishlist: true };
}

export async function fetchProductsByIdsFromSupabase(productIds: string[], envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;
  if (!Array.isArray(productIds) || productIds.length === 0) return [];

  const { data, error } = await client
    .from('products')
    .select('*, categories(name, slug)')
    .in('id', productIds);

  if (error || !data) return [];
  for (const p of data) {
    const { data: vars } = await client.from('product_variants').select('*').eq('product_id', p.id);
    p.variants = vars || [];
    if (p.categories) {
      p.category_name = p.categories.name;
      p.category_slug = p.categories.slug;
    }
    if (typeof p.images === 'string') {
      try {
        p.images = JSON.parse(p.images);
      } catch {
        p.images = [p.images];
      }
    }
  }
  return data;
}

export async function createReminderInSupabase(
  launchSoonId: string,
  email?: string | null,
  phone?: string | null,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured' };

  const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await client.from('reminders').insert({
    id,
    launch_soon_id: launchSoonId,
    email: email || null,
    phone: phone || null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// -------------------------------------------------------------------
// 9. STAFF & AUTH
// -------------------------------------------------------------------

export async function fetchStaffFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client
    .from('customers')
    .select('id, email, full_name, phone, role, created_at, updated_at')
    .in('role', ['admin', 'employee'])
    .order('role', { ascending: true });

  if (error || !data) return null;
  return data;
}

export async function updateStaffPasswordInSupabase(
  userId: string,
  newPasswordHash: string,
  envObj?: any
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Database not configured: Missing SUPABASE_URL / key' };

  const { error } = await client
    .from('customers')
    .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Supabase updateStaffPassword error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// -------------------------------------------------------------------
// 10. IMAGE STORAGE UPLOAD (Edge & Node Compatible)
// -------------------------------------------------------------------

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function uploadImageToSupabaseStorage(
  filename: string,
  base64Data: string,
  envObj?: any
): Promise<string> {
  const matches = base64Data.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/i);
  if (!matches) {
    throw new Error('Only JPEG, PNG, WebP, or GIF image uploads are allowed.');
  }

  const mimeType = matches[1].toLowerCase();
  const base64String = matches[2];
  const bytes = base64ToUint8Array(base64String);
  if (bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error('Uploaded image exceeds the 5MB limit.');
  }

  const client = getSupabaseClient(envObj);
  if (!client) return base64Data;

  try {
    const rawExt = (filename.split('.').pop() || 'png').toLowerCase();
    const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'png';
    const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const { data, error } = await client.storage.from('product-images').upload(filePath, bytes, {
      contentType: mimeType,
      upsert: true,
    });

    if (error || !data) {
      console.warn('Supabase storage upload fallback:', error?.message);
      return base64Data;
    }

    const { data: pubUrlData } = client.storage.from('product-images').getPublicUrl(filePath);
    return pubUrlData?.publicUrl || base64Data;
  } catch (err) {
    console.error('Failed to upload to Supabase storage:', err);
    return base64Data;
  }
}

// -------------------------------------------------------------------
// 11. LIVE SCHEMA INTROSPECTION & SQL GENERATION
// -------------------------------------------------------------------

export async function generateLiveDatabaseSchema(envObj?: any): Promise<{
  success: boolean;
  sql?: string;
  source?: 'live_introspected' | 'schema_file' | 'schema_template';
  tablesCount?: number;
  databaseUrl?: string;
  timestamp?: string;
  error?: string;
}> {
  const rawUrl = getEnvVar('SUPABASE_URL', envObj);
  const url = cleanSupabaseUrl(rawUrl);
  const serviceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', envObj);
  const anonKey = getEnvVar('SUPABASE_ANON_KEY', envObj);
  const key = serviceKey || anonKey;

  if (!url || !key) {
    return {
      success: false,
      error: 'Supabase database credentials (SUPABASE_URL & key) are not configured in environment variables.',
    };
  }

  const cleanHost = url.replace(/^https?:\/\//, '').split('/')[0];
  const timestamp = new Date().toISOString();

  try {
    // 1. Fetch live OpenAPI schema definition from connected Supabase PostgREST
    const openApiUrl = `${url}/rest/v1/`;
    const openApiRes = await fetch(openApiUrl, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }).catch(() => null);

    let introspectedSql = '';
    let tablesCount = 0;

    if (openApiRes && openApiRes.ok) {
      const openApiJson = await openApiRes.json().catch(() => null);
      const definitions = openApiJson?.definitions || {};
      const defKeys = Object.keys(definitions).filter((k) => k !== 'rpc');

      if (defKeys.length > 0) {
        tablesCount = defKeys.length;
        introspectedSql += `-- ====================================================================\n`;
        introspectedSql += `-- ATAL STORE — LIVE INTROSPECTED SUPABASE DATABASE SCHEMA\n`;
        introspectedSql += `-- Introspected from: ${cleanHost}\n`;
        introspectedSql += `-- Introspected at:   ${timestamp}\n`;
        introspectedSql += `-- Total Tables:       ${tablesCount} (${defKeys.join(', ')})\n`;
        introspectedSql += `-- ====================================================================\n\n`;

        for (const tableName of defKeys) {
          const def = definitions[tableName];
          const props = def.properties || {};
          const requiredCols = new Set<string>(def.required || []);
          const colsSql: string[] = [];

          introspectedSql += `-- --------------------------------------------------------------------\n`;
          introspectedSql += `-- TABLE: public.${tableName}\n`;
          if (def.description) {
            introspectedSql += `-- ${def.description.replace(/\n/g, '\n-- ')}\n`;
          }
          introspectedSql += `-- --------------------------------------------------------------------\n`;
          introspectedSql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;

          for (const [colName, info] of Object.entries<any>(props)) {
            let pgType = 'TEXT';
            if (info.type === 'integer') {
              pgType = 'INTEGER';
            } else if (info.type === 'number') {
              pgType = 'NUMERIC';
            } else if (info.type === 'boolean') {
              pgType = 'BOOLEAN';
            } else if (info.type === 'array' || info.type === 'object') {
              pgType = 'JSONB';
            } else if (info.format && info.format.includes('date')) {
              pgType = 'TIMESTAMPTZ';
            }

            const isPk = colName === 'id' || colName === 'key' || colName === 'section_key' || colName === 'old_slug';
            const pkClause = isPk ? ' PRIMARY KEY' : '';
            const notNullClause = requiredCols.has(colName) || isPk ? ' NOT NULL' : '';
            
            let defaultClause = '';
            if (colName === 'created_at' || colName === 'updated_at') {
              defaultClause = ' DEFAULT NOW()';
            } else if (colName === 'display_order' || colName === 'usage_count' || colName === 'festive_deal_order' || colName === 'spotlight_order' || colName === 'new_launch_order') {
              defaultClause = ' DEFAULT 0';
            } else if (colName === 'is_active' || colName === 'is_enabled') {
              defaultClause = ' DEFAULT 1';
            } else if (colName === 'currency') {
              defaultClause = " DEFAULT 'PKR'";
            } else if (colName === 'brand') {
              defaultClause = " DEFAULT 'ATAL'";
            }

            // Check foreign keys
            let fkClause = '';
            if (colName === 'category_id' && tableName !== 'categories') {
              fkClause = ' REFERENCES public.categories(id)';
            } else if (colName === 'subcategory_id') {
              fkClause = ' REFERENCES public.subcategories(id)';
            } else if (colName === 'product_id' && tableName !== 'products') {
              fkClause = ' REFERENCES public.products(id) ON DELETE CASCADE';
            } else if (colName === 'order_id' && tableName === 'order_items') {
              fkClause = ' REFERENCES public.orders(id) ON DELETE CASCADE';
            } else if (colName === 'customer_id') {
              fkClause = ' REFERENCES public.customers(id) ON DELETE CASCADE';
            }

            colsSql.push(`  ${colName} ${pgType}${pkClause}${fkClause}${notNullClause}${defaultClause}`);
          }

          introspectedSql += colsSql.join(',\n');
          introspectedSql += `\n);\n\n`;

          // Enable RLS for table
          introspectedSql += `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n`;
          introspectedSql += `CREATE POLICY IF NOT EXISTS "Public Read ${tableName}" ON public.${tableName} FOR SELECT USING (true);\n`;
          introspectedSql += `CREATE POLICY IF NOT EXISTS "Service Role Full ${tableName}" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);\n\n`;
        }

        // Add functions, triggers & indexes
        introspectedSql += `-- --------------------------------------------------------------------\n`;
        introspectedSql += `-- DATABASE FUNCTIONS & TRIGGERS\n`;
        introspectedSql += `-- --------------------------------------------------------------------\n`;
        introspectedSql += `CREATE OR REPLACE FUNCTION public.handle_updated_at()\n`;
        introspectedSql += `RETURNS TRIGGER AS $$\n`;
        introspectedSql += `BEGIN\n`;
        introspectedSql += `  NEW.updated_at = NOW();\n`;
        introspectedSql += `  RETURN NEW;\n`;
        introspectedSql += `END;\n`;
        introspectedSql += `$$ LANGUAGE plpgsql;\n\n`;

        introspectedSql += `-- INDEXES FOR HIGH-PERFORMANCE QUERYING\n`;
        introspectedSql += `CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);\n`;
        introspectedSql += `CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);\n`;
        introspectedSql += `CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);\n`;
        introspectedSql += `CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);\n\n`;

        return {
          success: true,
          sql: introspectedSql,
          source: 'live_introspected',
          tablesCount,
          databaseUrl: cleanHost,
          timestamp,
        };
      }
    }

    // 2. Fallback to complete schema definition if live tables are not yet initialized in PostgREST
    const fallbackSql = `-- ====================================================================
-- ATAL STORE — COMPLETE SUPABASE POSTGRESQL DATABASE SCHEMA & RLS POLICIES
-- Target Connected Database: ${cleanHost}
-- Timestamp:                ${timestamp}
-- ====================================================================

-- 1. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  image TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUBCATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'ATAL',
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  subcategory_id TEXT REFERENCES public.subcategories(id),
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  purchase_price NUMERIC DEFAULT 0,
  original_price NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  available_stock INTEGER NOT NULL DEFAULT 10,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  weight NUMERIC DEFAULT 0,
  dimensions TEXT DEFAULT '',
  shipping_requirements TEXT DEFAULT '',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  new_launch INTEGER NOT NULL DEFAULT 0,
  spotlight INTEGER NOT NULL DEFAULT 0,
  festive_deal INTEGER NOT NULL DEFAULT 0,
  festive_deal_order INTEGER DEFAULT 0,
  spotlight_order INTEGER DEFAULT 0,
  new_launch_order INTEGER DEFAULT 0,
  rating NUMERIC NOT NULL DEFAULT 5.0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_name TEXT,
  color_code TEXT,
  size TEXT,
  sku TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT
);

-- 6. LAUNCH SOON TABLE
CREATE TABLE IF NOT EXISTS public.launch_soon (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  expected_launch_date TEXT NOT NULL,
  countdown_target TEXT,
  coming_soon_badge TEXT NOT NULL DEFAULT 'Coming Soon',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  cta_text TEXT NOT NULL DEFAULT 'Shop Now',
  cta_url TEXT NOT NULL DEFAULT '/',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. HOMEPAGE SECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  section_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  layout TEXT DEFAULT 'carousel',
  max_items INTEGER NOT NULL DEFAULT 12,
  custom_settings TEXT
);

-- 9. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  phone TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  street_address TEXT NOT NULL,
  landmark TEXT,
  order_notes TEXT,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC NOT NULL DEFAULT 0,
  shipping_fee NUMERIC NOT NULL DEFAULT 290,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'Pending',
  tracking_number TEXT,
  tracking_courier TEXT,
  transaction_ref TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_title TEXT,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  image_url TEXT,
  total NUMERIC NOT NULL
);

-- 12. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. WISHLIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. SLUG REDIRECTS TABLE
CREATE TABLE IF NOT EXISTS public.slug_redirects (
  old_slug TEXT PRIMARY KEY,
  new_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  entity_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. REMINDERS TABLE
CREATE TABLE IF NOT EXISTS public.reminders (
  id TEXT PRIMARY KEY,
  launch_soon_id TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_soon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Subcategories" ON public.subcategories FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Product Variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Public Read Launch Soon" ON public.launch_soon FOR SELECT USING (true);
CREATE POLICY "Public Read Banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Public Read Homepage Sections" ON public.homepage_sections FOR SELECT USING (true);
CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Select Orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Insert Order Items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Select Order Items" ON public.order_items FOR SELECT USING (true);

CREATE POLICY "Allow All Settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Subcategories" ON public.subcategories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Product Variants" ON public.product_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Launch Soon" ON public.launch_soon FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Homepage Sections" ON public.homepage_sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Order Items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Wishlist" ON public.wishlist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Audit Logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Slug Redirects" ON public.slug_redirects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Reminders" ON public.reminders FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- TRIGGERS & FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
`;

    return {
      success: true,
      sql: fallbackSql,
      source: 'schema_template',
      tablesCount: 17,
      databaseUrl: cleanHost,
      timestamp,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to generate schema from connected database: ${err?.message || String(err)}`,
    };
  }
}

