import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Helper to resolve env vars across Node.js (process.env) and Cloudflare Pages (env object)
function getEnvVar(name: string, envObj?: any): string | undefined {
  if (envObj && typeof envObj[name] === 'string' && envObj[name].trim()) {
    return envObj[name].trim();
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[name]) return process.env[name]!.trim();
    const viteKey = `VITE_${name}`;
    if (process.env[viteKey]) return process.env[viteKey]!.trim();
  }
  return undefined;
}

export function getSupabaseClient(envObj?: any): SupabaseClient | null {
  const url = getEnvVar('SUPABASE_URL', envObj) || getEnvVar('VITE_SUPABASE_URL', envObj);
  const key =
    getEnvVar('SUPABASE_SERVICE_ROLE_KEY', envObj) ||
    getEnvVar('SUPABASE_ANON_KEY', envObj) ||
    getEnvVar('VITE_SUPABASE_ANON_KEY', envObj);

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

// -------------------------------------------------------------------
// SUPABASE DATABASE CRUD OPERATIONS
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

export async function updateSettingsInSupabase(settings: Record<string, any>, envObj?: any): Promise<boolean> {
  const client = getSupabaseClient(envObj);
  if (!client) return false;

  const rows = Object.entries(settings).map(([key, val]) => ({
    key,
    value: String(val ?? ''),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await client.from('settings').upsert(rows, { onConflict: 'key' });
  if (error) {
    console.error('Supabase updateSettings error:', error);
    return false;
  }
  return true;
}

export async function fetchCategoriesFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data: cats, error } = await client.from('categories').select('*').order('display_order', { ascending: true });
  if (error || !cats) {
    console.error('Supabase fetchCategories error:', error);
    return null;
  }

  for (const cat of cats) {
    const { data: subs } = await client.from('subcategories').select('*').eq('category_id', cat.id).order('display_order', { ascending: true });
    cat.subcategories = subs || [];
    const { count } = await client.from('products').select('id', { count: 'exact', head: true }).eq('category_id', cat.id);
    cat.product_count = count || 0;
  }
  return cats;
}

export async function saveCategoryInSupabase(category: any, envObj?: any): Promise<{ success: boolean; id?: string; slug?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Supabase not configured' };

  const id = category.id || `cat_${Date.now()}`;
  const slug = (category.slug || category.name || 'category').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

  const row = {
    id,
    name: category.name,
    slug,
    icon: category.icon || 'Sparkles',
    image: category.image || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80',
    description: category.description || '',
    display_order: Number(category.display_order || 1),
  };

  const { error } = await client.from('categories').upsert(row, { onConflict: 'id' });
  if (error) {
    console.error('Supabase saveCategory error:', error);
    return { success: false, error: error.message };
  }
  return { success: true, id, slug };
}

export async function deleteCategoryInSupabase(id: string, envObj?: any): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Supabase not configured' };

  const { count } = await client.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
  if (count && count > 0) {
    return { success: false, error: 'Cannot delete category: Contains assigned products.' };
  }

  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) {
    console.error('Supabase deleteCategory error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function fetchProductsFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data: prods, error } = await client.from('products').select('*').order('created_at', { ascending: false });
  if (error || !prods) {
    console.error('Supabase fetchProducts error:', error);
    return null;
  }

  for (const p of prods) {
    const { data: vars } = await client.from('product_variants').select('*').eq('product_id', p.id);
    p.variants = vars || [];
    if (typeof p.images === 'string') {
      try { p.images = JSON.parse(p.images); } catch { p.images = [p.images]; }
    }
    if (!Array.isArray(p.images) || p.images.length === 0) {
      p.images = ['/icon.svg'];
    }
  }

  return prods;
}

export async function fetchProductBySlugOrIdFromSupabase(slugOrId: string, envObj?: any): Promise<{ product: any; related: any[] } | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client.from('products').select('*').or(`slug.eq.${slugOrId},id.eq.${slugOrId}`).maybeSingle();
  if (error || !data) return null;

  const { data: vars } = await client.from('product_variants').select('*').eq('product_id', data.id);
  data.variants = vars || [];
  if (typeof data.images === 'string') {
    try { data.images = JSON.parse(data.images); } catch { data.images = [data.images]; }
  }
  if (!Array.isArray(data.images) || data.images.length === 0) {
    data.images = ['/icon.svg'];
  }
  data.rating = typeof data.rating === 'number' && !isNaN(data.rating) ? data.rating : 5.0;
  data.reviews_count = typeof data.reviews_count === 'number' && !isNaN(data.reviews_count) ? data.reviews_count : 0;

  const { data: relRaw } = await client.from('products').select('*').eq('category_id', data.category_id).neq('id', data.id).limit(4);
  const related = (relRaw || []).map((r: any) => {
    if (typeof r.images === 'string') {
      try { r.images = JSON.parse(r.images); } catch { r.images = [r.images]; }
    }
    if (!Array.isArray(r.images) || r.images.length === 0) r.images = ['/icon.svg'];
    r.sale_price = typeof r.sale_price === 'number' ? r.sale_price : 0;
    return r;
  });

  return { product: data, related };
}

export async function saveProductInSupabase(p: any, envObj?: any): Promise<{ success: boolean; id?: string; slug?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Supabase not configured' };

  const id = p.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const rawSlug = (p.slug || p.name || 'product').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = rawSlug || `product-${Date.now()}`;
  const sku = p.sku || `ATAL-${slug.toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-3)}`;

  const imagesArr = Array.isArray(p.images) && p.images.filter(Boolean).length > 0
    ? p.images.filter(Boolean)
    : typeof p.images === 'string'
      ? [p.images]
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

  // Insert variants if supplied
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

export async function deleteProductInSupabase(id: string, envObj?: any): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Supabase not configured' };

  const { error } = await client.from('products').delete().eq('id', id);
  if (error) {
    console.error('Supabase deleteProduct error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function fetchBannersFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client.from('banners').select('*').order('display_order', { ascending: true });
  if (error || !data) {
    console.error('Supabase fetchBanners error:', error);
    return null;
  }
  return data;
}

export async function saveBannerInSupabase(banner: any, envObj?: any): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Supabase not configured' };

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

export async function deleteBannerInSupabase(id: string, envObj?: any): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Supabase not configured' };

  const { error } = await client.from('banners').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchSectionsFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data, error } = await client.from('homepage_sections').select('*').order('display_order', { ascending: true });
  if (error || !data) return null;
  return data;
}

export async function saveSectionsInSupabase(sections: any[], envObj?: any): Promise<boolean> {
  const client = getSupabaseClient(envObj);
  if (!client) return false;

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
    return false;
  }
  return true;
}

export async function fetchOrdersFromSupabase(envObj?: any): Promise<any[] | null> {
  const client = getSupabaseClient(envObj);
  if (!client) return null;

  const { data: orders, error } = await client.from('orders').select('*').order('created_at', { ascending: false });
  if (error || !orders) return null;

  for (const o of orders) {
    const { data: items } = await client.from('order_items').select('*').eq('order_id', o.id);
    o.items = items || [];
  }
  return orders;
}

export async function updateOrderStatusInSupabase(id: string, body: any, envObj?: any): Promise<boolean> {
  const client = getSupabaseClient(envObj);
  if (!client) return false;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.order_status) updates.order_status = body.order_status;
  if (body.payment_status) updates.payment_status = body.payment_status;
  if (body.tracking_number !== undefined) updates.tracking_number = body.tracking_number;
  if (body.tracking_courier !== undefined) updates.tracking_courier = body.tracking_courier;
  if (body.transaction_id !== undefined) updates.transaction_id = body.transaction_id;
  if (body.transaction_ref !== undefined) updates.transaction_ref = body.transaction_ref;

  const { error } = await client.from('orders').update(updates).eq('id', id);
  if (error) {
    console.error('Supabase updateOrderStatus error:', error);
    return false;
  }
  return true;
}

export async function createOrderInSupabase(body: any, envObj?: any): Promise<{ success: boolean; order?: any; error?: string }> {
  const client = getSupabaseClient(envObj);
  if (!client) return { success: false, error: 'Supabase not configured' };

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
  }

  return { success: true, order: { ...orderRow, items: body.items || [] } };
}

export async function uploadImageToSupabaseStorage(filename: string, base64Data: string, envObj?: any): Promise<string> {
  const client = getSupabaseClient(envObj);
  if (!client) return base64Data;

  try {
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return base64Data;

    const mimeType = matches[1];
    const base64String = matches[2];
    const buffer = Buffer.from(base64String, 'base64');
    const ext = filename.split('.').pop() || 'png';
    const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const { data, error } = await client.storage.from('product-images').upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error || !data) {
      console.warn('Supabase storage upload fallback:', error?.message);
      return base64Data;
    }

    const { data: pubUrlData } = client.storage.from('product-images').getPublicUrl(filePath);
    return pubUrlData.publicUrl || base64Data;
  } catch (err) {
    console.error('Failed to upload to Supabase storage:', err);
    return base64Data;
  }
}

