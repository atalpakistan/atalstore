-- ====================================================================
-- ATAL STORE — COMPLETE SUPABASE POSTGRESQL DATABASE SCHEMA & RLS POLICIES
-- Execute this script in your Supabase SQL Editor (https://app.supabase.com)
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
-- Enable public read for catalog & authenticated/anon write via service_role / anon key
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

-- Allow public read access to active storefront data
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

-- Allow full access for anon and service_role (API layer authenticates admin tokens)
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
-- SEED INITIAL STORE DEFAULT VALUES
-- ====================================================================

INSERT INTO public.settings (key, value) VALUES
  ('store_name', 'ATAL STORE'),
  ('tagline', 'Smart Shop. Live Better'),
  ('announcement_bar_text', '🇵🇰 Free Nationwide Delivery on orders above Rs. 9,999 | Rs. 290 Delivery Fee | 100% Genuine Guaranteed'),
  ('announcement_bar_enabled', 'true'),
  ('header_logo_url', '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg'),
  ('header_logo_height', '42'),
  ('footer_logo_url', '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg'),
  ('footer_description', 'ATAL – Shop Smart. Live Better. 🛍️\nYour trusted online store for beauty, cosmetics, perfumes, fashion & electronics—quality products, stylish choices, and easy shopping, all in one place. ✨'),
  ('support_whatsapp', '03719150297'),
  ('support_email', 'contact.to.atal@gmail.com'),
  ('support_hours', 'Monday – Saturday: 9:00 AM – 9:00 PM PKT'),
  ('social_facebook', 'https://www.facebook.com/share/1DgG52novy/'),
  ('social_instagram', 'https://www.instagram.com/atal.pakistan?stkn=dXM2NTl0bHBzZ21n'),
  ('social_tiktok', 'https://www.tiktok.com/@atal.pakistan'),
  ('free_shipping_threshold', '9999'),
  ('default_shipping_fee', '290'),
  ('delivery_advance_mandatory', 'true'),
  ('min_order_amount', '500'),
  ('cod_enabled', 'true'),
  ('jazzcash_enabled', 'true'),
  ('jazzcash_account_title', 'Omar Farooq'),
  ('jazzcash_account_number', '03227796097'),
  ('jazzcash_qr_url', '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.26.22_PM_96ced8c4.jpeg'),
  ('easypaisa_enabled', 'true'),
  ('easypaisa_account_title', 'Omar Farooq'),
  ('easypaisa_account_number', '03227796097'),
  ('easypaisa_qr_url', '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.24.41_PM_3cd4a1f7.jpeg'),
  ('hbl_enabled', 'true'),
  ('hbl_account_title', 'Umer Farooq'),
  ('hbl_account_number', '50627918149903'),
  ('hbl_qr_url', '/assets/aistudio/WhatsApp_Image_2026-10-22_at_9.45.39_AM_5e21af89.jpeg')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.categories (id, name, slug, icon, image, description, display_order) VALUES
  ('cat_men', 'Men', 'men', 'Shirt', 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80', 'Men’s formal, casual, festive apparel, grooming, and luxury leather accessories.', 1),
  ('cat_women', 'Women', 'women', 'Sparkles', 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=600&q=80', 'Designer lawn, luxury pret, footwear, handbags, and fine Pakistani jewellery.', 2),
  ('cat_kids', 'Kids', 'kids', 'Baby', 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=600&q=80', 'Comfortable festive and everyday wear for boys, girls, babies, and educational toys.', 3),
  ('cat_cosmetics', 'Cosmetics & Perfume', 'cosmetics-perfume', 'Flame', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80', 'Premium skincare, authentic oud, Arabian fragrances, and organic beauty kits.', 4),
  ('cat_electronics', 'Electronics', 'electronics', 'Headphones', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80', 'ANC earbuds, smartwatches, fast charging adapters, and premium mobile accessories.', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.homepage_sections (section_key, title, subtitle, is_enabled, display_order, layout, max_items) VALUES
  ('carousel', 'Featured Promotions', 'Exclusive seasonal highlights', 1, 1, 'carousel', 12),
  ('categories', 'Shop by Category', 'Explore curated Pakistani collections', 1, 2, 'horizontal_row', 12),
  ('festive_deals', '⚡ Featured Festive Deals', 'Exclusive limited-time savings across Pakistan', 1, 3, 'carousel', 12),
  ('spotlight', 'Spotlight Products', 'Handcrafted precision and luxury picks', 1, 4, 'featured_split', 12),
  ('all_products', 'Shop All Products', 'Browse our comprehensive verified catalog', 1, 5, 'grid', 12),
  ('new_launch', 'New Launch', 'Freshly arrived this week in store', 1, 6, 'carousel', 12),
  ('launch_soon', 'Launch Soon', 'Upcoming drops with priority notifications', 1, 7, 'carousel', 12)
ON CONFLICT (section_key) DO NOTHING;

INSERT INTO public.banners (id, title, subtitle, image_url, cta_text, cta_url, display_order, is_active) VALUES
  ('ban_01', 'FESTIVE EID & WEDDING COLLECTION', 'Handcrafted Pakistani luxury kurtas, sherwanis, and lawn ensembles.', 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=1600&q=80', 'Explore Festive Deals', '/category/men', 1, 1),
  ('ban_02', 'ATAL AUDIOPHILE PRO SERIES', 'Wireless Active Noise Cancellation designed for Pakistani professionals.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80', 'Shop Electronics', '/category/electronics', 2, 1),
  ('ban_03', 'DAMASCUS ROSE & OUD COUTURE', 'Pure essential elixirs and oriental fragrances distilled for royalty.', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1600&q=80', 'Discover Perfumes', '/category/cosmetics-perfume', 3, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, slug, sku, brand, category_id, short_description, description, images, purchase_price, original_price, sale_price, available_stock, low_stock_threshold, rating, reviews_count, festive_deal, spotlight, new_launch) VALUES
  ('prod_01', 'Royal Oud & Amber Essence 50ml', 'royal-oud-amber-essence-50ml', 'ATAL-PERF-001', 'ATAL Couture', 'cat_cosmetics', 'Pure concentrated Arabian Oud infused with royal amber and damascus rose notes.', 'Hand-blended artisanal oriental elixir with long-lasting projection (24+ hours). Ideal for special occasions and daily luxury.', '["https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80"]'::jsonb, 3500, 7500, 5490, 25, 5, 4.9, 18, 1, 1, 1),
  ('prod_02', 'ANC Pro Wireless Earbuds', 'anc-pro-wireless-earbuds', 'ATAL-ELEC-002', 'ATAL Audio', 'cat_electronics', '35dB Active Noise Cancellation with HD dual microphones and fast wireless charging.', 'Experience deep bass and crystal clear calling. Designed for remote meetings, music lovers, and travel.', '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"]'::jsonb, 2800, 6990, 4890, 14, 5, 4.8, 32, 1, 1, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.coupons (id, code, discount_type, discount_value, min_order_amount, is_active) VALUES
  ('cp_welcome', 'ATAL10', 'percentage', 10, 2000, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (id, email, password_hash, full_name, phone, role) VALUES
  ('usr_admin_uatal', 'uatal.pk@gmail.com', 'a632bd66b16d10128eaec5bfd1eec25381a17faeaebf2fa2ecda8b8e05e55b6c', 'Umer (Administrator)', '03719150297', 'admin'),
  ('usr_emp_ali', 'ali@atal.com', 'a632bd66b16d10128eaec5bfd1eec25381a17faeaebf2fa2ecda8b8e05e55b6c', 'Ali (Store Manager)', '03719150297', 'employee')
ON CONFLICT (id) DO NOTHING;
