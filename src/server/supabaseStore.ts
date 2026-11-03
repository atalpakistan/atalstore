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
    else if (!isNaN(Number(r.value)) && r.value.trim() !== '') settings[r.key] = Number(r.value);
    else settings[r.key] = r.value;
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
  const row = {
    id,
    code: String(coupon.code || '').trim().toUpperCase(),
    discount_type: coupon.discount_type || 'percentage',
    discount_value: Number(coupon.discount_value || 0),
    min_order_amount: Number(coupon.min_order_amount || 0),
    usage_count: Number(coupon.usage_count || 0),
    is_active: coupon.is_active ?? 1,
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

  const orderId = body.id || `ATL-${Math.floor(100000 + Math.random() * 900000)}`;
  const cleanTxId = body.transaction_id || body.transaction_ref || null;
  const orderRow = {
    id: orderId,
    customer_id: body.customer_id || null,
    customer_name: body.customer_name || 'Customer',
    customer_email: body.customer_email || null,
    phone: body.phone || '03000000000',
    province: body.province || 'Punjab',
    city: body.city || 'Lahore',
    area: body.area || 'Central',
    street_address: body.street_address || 'Address',
    landmark: body.landmark || null,
    order_notes: body.order_notes || null,
    subtotal: Number(body.subtotal || 0),
    discount: Number(body.discount || 0),
    shipping_fee: Number(body.shipping_fee || 290),
    total_amount: Number(body.total_amount || body.subtotal || 0),
    payment_method: body.payment_method || 'cod',
    payment_status: 'pending',
    order_status: 'Pending',
    transaction_id: cleanTxId,
    transaction_ref: cleanTxId,
  };

  const { error: ordErr } = await client.from('orders').insert(orderRow);
  if (ordErr) {
    console.error('Supabase createOrder error:', ordErr);
    return { success: false, error: ordErr.message };
  }

  if (body.items && Array.isArray(body.items)) {
    const itemRows = body.items.map((it: any, idx: number) => ({
      id: `it_${orderId}_${idx + 1}`,
      order_id: orderId,
      product_id: it.product_id || it.id,
      product_name: it.product_name || it.name || 'Product',
      variant_title: it.variant_title || null,
      price: Number(it.price || 0),
      quantity: Number(it.quantity || 1),
      image_url: it.image_url || it.image || null,
      total: Number((it.price || 0) * (it.quantity || 1)),
    }));
    await client.from('order_items').insert(itemRows);

    // Deduct stock in Supabase products table
    for (const it of body.items) {
      const pid = it.product_id || it.id;
      if (pid) {
        const { data: pData } = await client.from('products').select('available_stock').eq('id', pid).maybeSingle();
        if (pData && typeof pData.available_stock === 'number') {
          const newStock = Math.max(0, pData.available_stock - Number(it.quantity || 1));
          await client.from('products').update({ available_stock: newStock }).eq('id', pid);
        }
      }
    }
  }

  return { success: true, order: { ...orderRow, items: body.items || [] } };
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
  const client = getSupabaseClient(envObj);
  if (!client) return base64Data;

  try {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return base64Data;

    const mimeType = matches[1];
    const base64String = matches[2];
    const bytes = base64ToUint8Array(base64String);
    const ext = filename.split('.').pop() || 'png';
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
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
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
      tablesCount: 15,
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

