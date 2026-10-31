import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure public uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'atal_store.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = 'atal_salt_2026_pk';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      image TEXT NOT NULL,
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sku TEXT NOT NULL,
      brand TEXT NOT NULL,
      category_id TEXT NOT NULL,
      subcategory_id TEXT,
      short_description TEXT NOT NULL,
      description TEXT NOT NULL,
      images TEXT NOT NULL, -- JSON array
      purchase_price REAL NOT NULL DEFAULT 0,
      original_price REAL NOT NULL,
      sale_price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PKR',
      available_stock INTEGER NOT NULL DEFAULT 10,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      weight REAL,
      dimensions TEXT,
      shipping_requirements TEXT,
      seo_title TEXT,
      seo_description TEXT,
      new_launch INTEGER NOT NULL DEFAULT 0,
      spotlight INTEGER NOT NULL DEFAULT 0,
      festive_deal INTEGER NOT NULL DEFAULT 0,
      festive_deal_order INTEGER DEFAULT 0,
      spotlight_order INTEGER DEFAULT 0,
      new_launch_order INTEGER DEFAULT 0,
      rating REAL NOT NULL DEFAULT 5.0,
      reviews_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      color_name TEXT,
      color_code TEXT,
      size TEXT,
      sku TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS launch_soon (
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      short_description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      expected_launch_date TEXT NOT NULL,
      countdown_target TEXT,
      coming_soon_badge TEXT NOT NULL DEFAULT 'Coming Soon',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS banners (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      image_url TEXT NOT NULL,
      cta_text TEXT NOT NULL,
      cta_url TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS homepage_sections (
      section_key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      layout TEXT DEFAULT 'standard',
      max_items INTEGER NOT NULL DEFAULT 12,
      custom_settings TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      province TEXT NOT NULL,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      street_address TEXT NOT NULL,
      landmark TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
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
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      shipping_fee REAL NOT NULL DEFAULT 290,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'cod' | 'jazzcash' | 'easypaisa' | 'hbl'
      payment_status TEXT NOT NULL DEFAULT 'pending', 
      order_status TEXT NOT NULL DEFAULT 'Pending', 
      tracking_number TEXT,
      tracking_courier TEXT,
      transaction_ref TEXT,
      transaction_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      variant_title TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL, -- 'percentage' | 'fixed'
      discount_value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 0,
      max_discount REAL,
      usage_limit INTEGER,
      usage_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS slug_redirects (
      id TEXT PRIMARY KEY,
      old_slug TEXT NOT NULL UNIQUE,
      new_slug TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(customer_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      launch_soon_id TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Ensure all required columns exist dynamically across pre-existing DB tables
  const columnsToEnsure = [
    { table: 'coupons', column: 'created_at', type: 'TEXT' },
    { table: 'categories', column: 'created_at', type: 'TEXT' },
    { table: 'subcategories', column: 'created_at', type: 'TEXT' },
    { table: 'products', column: 'created_at', type: 'TEXT' },
    { table: 'products', column: 'updated_at', type: 'TEXT' },
    { table: 'product_variants', column: 'created_at', type: 'TEXT' },
    { table: 'launch_soon', column: 'created_at', type: 'TEXT' },
    { table: 'banners', column: 'created_at', type: 'TEXT' },
    { table: 'homepage_sections', column: 'created_at', type: 'TEXT' },
    { table: 'customers', column: 'created_at', type: 'TEXT' },
    { table: 'customers', column: 'updated_at', type: 'TEXT' },
    { table: 'addresses', column: 'created_at', type: 'TEXT' },
    { table: 'orders', column: 'created_at', type: 'TEXT' },
    { table: 'orders', column: 'updated_at', type: 'TEXT' },
    { table: 'orders', column: 'transaction_id', type: 'TEXT' },
    { table: 'order_items', column: 'created_at', type: 'TEXT' },
    { table: 'cart_items', column: 'updated_at', type: 'TEXT' },
    { table: 'cart_items', column: 'created_at', type: 'TEXT' },
    { table: 'wishlist_items', column: 'created_at', type: 'TEXT' },
    { table: 'reminders', column: 'created_at', type: 'TEXT' },
    { table: 'slug_redirects', column: 'created_at', type: 'TEXT' },
    { table: 'audit_logs', column: 'created_at', type: 'TEXT' },
  ];

  for (const c of columnsToEnsure) {
    ensureColumnExists(c.table, c.column, c.type);
  }

  // Force update core store configurations to ensure logo and shipping threshold updates persist
  updateCoreSettings();

  // Seed default data if database is new
  seedDefaults();
}

export function ensureColumnExists(tableName: string, columnName: string, colType: string = 'TEXT') {
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    const exists = columns.some(c => c.name === columnName);
    if (!exists) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${colType};`);
      if (columnName === 'created_at' || columnName === 'updated_at') {
        db.exec(`UPDATE ${tableName} SET ${columnName} = datetime('now') WHERE ${columnName} IS NULL;`);
      }
    }
  } catch (e) {
    console.error(`Error ensuring column ${columnName} on ${tableName}:`, e);
  }
}

function updateCoreSettings() {
  const coreSettings: Record<string, string> = {
    store_name: 'ATAL',
    tagline: 'Smart Shop. Live Better',
    announcement_bar_text: '🇵🇰 Free Nationwide Delivery on orders above Rs. 9,999 | Rs. 290 Delivery Fee | 100% Genuine Guaranteed',
    announcement_bar_enabled: 'true',
    header_logo_url: '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg',
    header_logo_height: '42',
    footer_logo_url: '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg',
    footer_description: 'ATAL – Shop Smart. Live Better. 🛍️\nYour trusted online store for beauty, cosmetics, perfumes, fashion & electronics—quality products, stylish choices, and easy shopping, all in one place. ✨',
    support_whatsapp: '03719150297',
    support_email: 'contact.to.atal@gmail.com',
    support_hours: 'Monday – Saturday: 9:00 AM – 9:00 PM PKT',
    social_facebook: 'https://www.facebook.com/share/1DgG52novy/',
    social_instagram: 'https://www.instagram.com/atal.pakistan?stkn=dXM2NTl0bHBzZ21n',
    social_tiktok: 'https://www.tiktok.com/@atal.pakistan',
    free_shipping_threshold: '9999',
    default_shipping_fee: '290',
    delivery_advance_mandatory: 'true',
    jazzcash_account_title: 'Omar Farooq',
    jazzcash_account_number: '03227796097',
    jazzcash_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.26.22_PM_96ced8c4.jpeg',
    easypaisa_account_title: 'Omar Farooq',
    easypaisa_account_number: '03227796097',
    easypaisa_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.24.41_PM_3cd4a1f7.jpeg',
    hbl_account_title: 'Umer Farooq',
    hbl_account_number: '50627918149903',
    hbl_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-22_at_9.45.39_AM_5e21af89.jpeg'
  };

  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(coreSettings)) {
    stmt.run(k, v);
  }
}

function seedDefaults() {
  const existingCategory = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (existingCategory.count > 0) {
    return; // Already initialized, protect persistence!
  }

  // 1. Default Settings
  const defaultSettings: Record<string, string> = {
    store_name: 'ATAL STORE',
    tagline: 'Smart Shop. Live Better',
    announcement_bar_text: '🇵🇰 Free Nationwide Delivery on orders above Rs. 9,999 | Rs. 290 Delivery Fee | 100% Genuine Guaranteed',
    announcement_bar_enabled: 'true',
    header_logo_url: '/icon.svg',
    header_logo_height: '42',
    footer_logo_url: '/icon.svg',
    footer_description: 'ATAL – Shop Smart. Live Better. 🛍️\nYour trusted online store for beauty, cosmetics, perfumes, fashion & electronics—quality products, stylish choices, and easy shopping, all in one place. ✨',
    support_whatsapp: '03719150297',
    support_email: 'contact.to.atal@gmail.com',
    support_hours: 'Monday – Saturday: 9:00 AM – 9:00 PM PKT',
    social_facebook: 'https://www.facebook.com/share/1DgG52novy/',
    social_instagram: 'https://www.instagram.com/atal.pakistan?stkn=dXM2NTl0bHBzZ21n',
    social_tiktok: 'https://www.tiktok.com/@atal.pakistan',
    social_youtube: 'https://youtube.com/@atalstorepk',
    policy_shipping: 'We deliver all across Pakistan within 2 to 4 business days via verified courier partners (TCS, Leopard, Trax). Standard delivery charge is Rs. 290, and Free Delivery applies on orders above Rs. 9,999. Advance payment of delivery charges is mandatory.',
    policy_return: 'Enjoy 7 days hassle-free return and exchange policy on unworn, unsealed items with original tags and packaging intact.',
    policy_privacy: 'ATAL STORE is committed to safeguarding customer data. We never share customer contact or payment data with unauthorized third parties.',
    policy_terms: 'By ordering from ATAL STORE, you agree to our standard terms of trade, authentic brand guarantees, and dispute settlement under Pakistani commercial regulations.',
    faq_content: 'Q: Do you offer Cash on Delivery?\nA: Yes, COD is supported nationwide. Advance payment of Rs. 290 delivery charges with Transaction ID is mandatory for all orders.\n\nQ: How long does delivery take?\nA: Orders in major cities (Lahore, Karachi, Islamabad) arrive in 2 business days; other regions take 3-4 days.',
    free_shipping_threshold: '9999',
    default_shipping_fee: '290',
    delivery_advance_mandatory: 'true',
    min_order_amount: '500',
    cod_enabled: 'true',
    jazzcash_enabled: 'true',
    jazzcash_account_title: 'Omar Farooq',
    jazzcash_account_number: '03227796097',
    jazzcash_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.26.22_PM_96ced8c4.jpeg',
    jazzcash_sandbox: 'true',
    easypaisa_enabled: 'true',
    easypaisa_account_title: 'Omar Farooq',
    easypaisa_account_number: '03227796097',
    easypaisa_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.24.41_PM_3cd4a1f7.jpeg',
    easypaisa_sandbox: 'true',
    hbl_enabled: 'true',
    hbl_account_title: 'Umer Farooq',
    hbl_account_number: '50627918149903',
    hbl_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-22_at_9.45.39_AM_5e21af89.jpeg'
  };

  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSetting.run(k, v);
  }

  // 2. Default Admin and Employee Users
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, email, password_hash, full_name, phone, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertCustomer.run(
    'usr_admin_uatal',
    'uatal.pk@gmail.com',
    hashPassword('Umer@9157'),
    'Umer (Administrator)',
    '03719150297',
    'admin'
  );
  insertCustomer.run(
    'usr_emp_ali',
    'ali@atal.com',
    hashPassword('Ali@297'),
    'Ali (Employee)',
    '03719150297',
    'employee'
  );

  // 3. Homepage Sections (in exact required order)
  const sections = [
    { key: 'carousel', title: 'Featured Promotions', subtitle: 'Exclusive seasonal highlights', order: 1, layout: 'carousel', max: 5 },
    { key: 'categories', title: 'Shop by Category', subtitle: 'Explore curated Pakistani collections', order: 2, layout: 'horizontal_row', max: 5 },
    { key: 'festive_deals', title: '⚡ Featured Festive Deals', subtitle: 'Exclusive limited-time savings across Pakistan', order: 3, layout: 'carousel', max: 8 },
    { key: 'spotlight', title: 'Spotlight Products', subtitle: 'Handcrafted precision and luxury picks', order: 4, layout: 'featured_split', max: 4 },
    { key: 'all_products', title: 'Shop All Products', subtitle: 'Browse our comprehensive verified catalog', order: 5, layout: 'grid', max: 24 },
    { key: 'new_launch', title: 'New Launch', subtitle: 'Freshly arrived this week in store', order: 6, layout: 'carousel', max: 8 },
    { key: 'launch_soon', title: 'Launch Soon', subtitle: 'Upcoming drops with priority notifications', order: 7, layout: 'carousel', max: 6 },
  ];

  const insertSection = db.prepare(`
    INSERT INTO homepage_sections (section_key, title, subtitle, is_enabled, display_order, layout, max_items)
    VALUES (?, ?, ?, 1, ?, ?, ?)
  `);
  for (const sec of sections) {
    insertSection.run(sec.key, sec.title, sec.subtitle, sec.order, sec.layout, sec.max);
  }

  // 4. Banners for Carousel
  const insertBanner = db.prepare(`
    INSERT INTO banners (id, title, subtitle, image_url, cta_text, cta_url, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertBanner.run(
    'ban_01',
    'FESTIVE EID & WEDDING COLLECTION',
    'Handcrafted Pakistani luxury kurtas, sherwanis, and lawn ensembles.',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80',
    'Explore Festive Deals',
    '/category/men',
    1
  );
  insertBanner.run(
    'ban_02',
    'ATAL AUDIOPHILE PRO SERIES',
    'Wireless Active Noise Cancellation designed for Pakistani professionals.',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80',
    'Shop Electronics',
    '/category/electronics',
    2
  );
  insertBanner.run(
    'ban_03',
    'DAMASCUS ROSE & OUD COUTURE',
    'Pure essential elixirs and oriental fragrances distilled for royalty.',
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1600&q=80',
    'Discover Perfumes',
    '/category/cosmetics-perfume',
    3
  );

  // 5. The 5 Main Categories (Exactly as specified)
  const categories = [
    {
      id: 'cat_men',
      name: 'Men',
      slug: 'men',
      icon: 'Shirt',
      image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80',
      description: 'Men’s formal, casual, festive apparel, grooming, and luxury leather accessories.',
      order: 1,
      subs: ['Clothing', 'Shoes', 'Watches', 'Accessories', 'Grooming', 'Bags']
    },
    {
      id: 'cat_women',
      name: 'Women',
      slug: 'women',
      icon: 'Sparkles',
      image: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=600&q=80',
      description: 'Designer lawn, luxury pret, footwear, handbags, and fine Pakistani jewellery.',
      order: 2,
      subs: ['Clothing', 'Shoes', 'Handbags', 'Jewelry', 'Accessories', 'Beauty Accessories']
    },
    {
      id: 'cat_kids',
      name: 'Kids',
      slug: 'kids',
      icon: 'Baby',
      image: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=600&q=80',
      description: 'Comfortable festive and everyday wear for boys, girls, babies, and educational toys.',
      order: 3,
      subs: ["Boys' Clothing", "Girls' Clothing", 'Baby Clothing', 'Shoes', 'Toys', 'Accessories']
    },
    {
      id: 'cat_cosmetics',
      name: 'Cosmetics & Perfume',
      slug: 'cosmetics-perfume',
      icon: 'Flame',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80',
      description: 'Premium skincare, authentic oud, Arabian fragrances, and organic beauty kits.',
      order: 4,
      subs: ['Skincare', 'Face Wash', 'Makeup', 'Perfumes', 'Fragrances', 'Hair Care', 'Beauty Kits', 'Personal Care']
    },
    {
      id: 'cat_electronics',
      name: 'Electronics',
      slug: 'electronics',
      icon: 'Headphones',
      image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80',
      description: 'ANC earbuds, smartwatches, fast charging adapters, and premium mobile accessories.',
      order: 5,
      subs: ['Mobile Accessories', 'Earbuds', 'Headphones', 'Speakers', 'Chargers and Cables', 'Smartwatches', 'Computer Accessories', 'Electronic Gadgets']
    }
  ];

  const insertCat = db.prepare(`
    INSERT INTO categories (id, name, slug, icon, image, description, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSub = db.prepare(`
    INSERT INTO subcategories (id, category_id, name, slug, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const cat of categories) {
    insertCat.run(cat.id, cat.name, cat.slug, cat.icon, cat.image, cat.description, cat.order);
    cat.subs.forEach((subName, idx) => {
      const subSlug = subName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      insertSub.run(`sub_${cat.id}_${idx + 1}`, cat.id, subName, subSlug, idx + 1);
    });
  }

  // 6. Curated Seed Products with Realistic Pakistani PKR Pricing & Rich Details
  const products = [
    {
      id: 'prod_001',
      name: 'ATAL Signature Royal Raw Silk Kurta',
      slug: 'atal-signature',
      sku: 'ATAL-MEN-KRT-01',
      brand: 'ATAL Heritage',
      category_id: 'cat_men',
      subcategory_id: 'sub_cat_men_1',
      short_description: 'Pure raw silk festive kurta with subtle collar threadwork and banarasi metallic buttons.',
      description: 'Handcrafted in Lahore by master artisans. Woven from 100% genuine raw silk with bespoke gold thread embroidery along the placket. Ideal for Eid gatherings, weddings, and formal evening festivities across Pakistan.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80'
      ]),
      purchase_price: 3200,
      original_price: 7999,
      sale_price: 5499,
      available_stock: 35,
      new_launch: 1,
      spotlight: 1,
      festive_deal: 1,
      festive_deal_order: 1,
      spotlight_order: 1,
      new_launch_order: 1,
      rating: 4.9,
      reviews_count: 142,
      variants: [
        { color: 'Emerald Green', hex: '#093824', size: 'M', sku: 'ATAL-KRT-GRN-M', price: 5499, stock: 15, img: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80' },
        { color: 'Emerald Green', hex: '#093824', size: 'L', sku: 'ATAL-KRT-GRN-L', price: 5499, stock: 12, img: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80' },
        { color: 'Midnight Black', hex: '#111827', size: 'L', sku: 'ATAL-KRT-BLK-L', price: 5499, stock: 8, img: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'prod_002',
      name: 'Google Pixel Earbuds Pro (Active Noise Cancelling)',
      slug: 'google-pixel-earbuds-pro',
      sku: 'ATAL-ELEC-EAR-02',
      brand: 'Google',
      category_id: 'cat_electronics',
      subcategory_id: 'sub_cat_electronics_2',
      short_description: 'Premium wireless earbuds with Silent Seal ANC, crystal-clear beamforming mics, and 31hr battery.',
      description: 'Experience studio acoustics with custom 11mm speaker drivers. Features transparency mode, wireless Qi charging, IPX4 splash resistance, and seamless Bluetooth multipoint pairing.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
      ]),
      purchase_price: 24000,
      original_price: 36000,
      sale_price: 28999,
      available_stock: 18,
      new_launch: 1,
      spotlight: 1,
      festive_deal: 1,
      festive_deal_order: 2,
      spotlight_order: 2,
      new_launch_order: 2,
      rating: 4.8,
      reviews_count: 88,
      variants: [
        { color: 'Charcoal', hex: '#262626', size: 'Standard', sku: 'GP-EAR-CHR', price: 28999, stock: 10, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80' },
        { color: 'Fog White', hex: '#f3f4f6', size: 'Standard', sku: 'GP-EAR-WHT', price: 28999, stock: 8, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'prod_003',
      name: 'Luxury Perfume 100ml — Royal Oud & Amber',
      slug: 'luxury-perfume-100ml',
      sku: 'ATAL-PERF-OUD-03',
      brand: 'ATAL Parfums',
      category_id: 'cat_cosmetics',
      subcategory_id: 'sub_cat_cosmetics_4',
      short_description: 'Long-lasting Extrait de Parfum infused with Cambodian Oud, Taif Rose, and French Vanilla.',
      description: 'An opulent fragrance crafted for discerning Pakistani connoisseurs. Top notes of Saffron and Cardamom lead to a rich heart of Taif Rose, anchored by pure aged Oud and warm Ambergris that lingers for 24+ hours.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80'
      ]),
      purchase_price: 4500,
      original_price: 9500,
      sale_price: 6499,
      available_stock: 40,
      new_launch: 1,
      spotlight: 1,
      festive_deal: 1,
      festive_deal_order: 3,
      spotlight_order: 3,
      new_launch_order: 3,
      rating: 5.0,
      reviews_count: 210,
      variants: [
        { color: '100ml Flacon', hex: '#ca8a04', size: '100ml', sku: 'OUD-ROYAL-100', price: 6499, stock: 40, img: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'prod_004',
      name: 'Embroidered Velvet Festive Shawl',
      slug: 'embroidered-velvet-festive-shawl',
      sku: 'ATAL-WOM-SHW-04',
      brand: 'Zari Mahal',
      category_id: 'cat_women',
      subcategory_id: 'sub_cat_women_1',
      short_description: 'Micro-velvet black shawl with intricate tilla and resham border embroidery.',
      description: 'Heirloom quality bridal and festive shawl crafted from plush micro-velvet. Adorned with heritage Mughal zardozi motifs along all four borders, offering royal warmth and elegance for winter soirees.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80'
      ]),
      purchase_price: 6000,
      original_price: 14500,
      sale_price: 9999,
      available_stock: 22,
      new_launch: 0,
      spotlight: 1,
      festive_deal: 1,
      festive_deal_order: 4,
      spotlight_order: 4,
      new_launch_order: 0,
      rating: 4.9,
      reviews_count: 67,
      variants: [
        { color: 'Royal Black', hex: '#0f172a', size: '2.5m x 1.25m', sku: 'SHW-BLK-2.5', price: 9999, stock: 15, img: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80' },
        { color: 'Deep Maroon', hex: '#881337', size: '2.5m x 1.25m', sku: 'SHW-MRN-2.5', price: 9999, stock: 7, img: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'prod_005',
      name: 'ATAL Ultra Chrono Men’s Sapphire Watch',
      slug: 'atal-ultra-chrono-sapphire-watch',
      sku: 'ATAL-MEN-WTC-05',
      brand: 'ATAL Timepieces',
      category_id: 'cat_men',
      subcategory_id: 'sub_cat_men_3',
      short_description: 'Precision Japanese quartz movement with anti-scratch sapphire crystal and 316L steel.',
      description: 'Bold 42mm chronometer with sunburst emerald dial, luminous hands, calendar aperture, and genuine Italian leather strap. Water-resistant up to 50 meters with 2-year official ATAL warranty.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80'
      ]),
      purchase_price: 7500,
      original_price: 16999,
      sale_price: 11499,
      available_stock: 14,
      new_launch: 1,
      spotlight: 0,
      festive_deal: 1,
      festive_deal_order: 5,
      spotlight_order: 0,
      new_launch_order: 4,
      rating: 4.9,
      reviews_count: 53,
      variants: [
        { color: 'Emerald & Gold', hex: '#093824', size: '42mm', sku: 'WTC-EMR-GLD', price: 11499, stock: 9, img: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80' },
        { color: 'Silver Classic', hex: '#94a3b8', size: '42mm', sku: 'WTC-SLV-BLK', price: 11499, stock: 5, img: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'prod_006',
      name: 'Kids Festive Kurta Shalwar Suit (Ages 3-12)',
      slug: 'kids-festive-kurta-shalwar-suit',
      sku: 'ATAL-KID-KRT-06',
      brand: 'Chanda Mama',
      category_id: 'cat_kids',
      subcategory_id: 'sub_cat_kids_1',
      short_description: 'Breathable soft-cotton 2-piece kurta shalwar set designed for all-day festive comfort.',
      description: 'Soft combed cotton tailored with comfortable loose cuffs, neat buttoned placket, and elasticated shalwar waist. Gentle on delicate skin with fade-resistant dye.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=800&q=80'
      ]),
      purchase_price: 1200,
      original_price: 3499,
      sale_price: 2499,
      available_stock: 50,
      new_launch: 1,
      spotlight: 0,
      festive_deal: 1,
      festive_deal_order: 6,
      spotlight_order: 0,
      new_launch_order: 5,
      rating: 4.7,
      reviews_count: 45,
      variants: [
        { color: 'Royal Blue', hex: '#1d4ed8', size: '4-5 Years', sku: 'KID-KRT-BLU-4', price: 2499, stock: 20, img: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=800&q=80' },
        { color: 'Royal Blue', hex: '#1d4ed8', size: '6-7 Years', sku: 'KID-KRT-BLU-6', price: 2499, stock: 15, img: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=800&q=80' },
        { color: 'Ivory White', hex: '#f8fafc', size: '4-5 Years', sku: 'KID-KRT-WHT-4', price: 2499, stock: 15, img: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'prod_007',
      name: 'ATAL 65W GaN Fast Charger & Braided Cable',
      slug: 'atal-65w-gan-fast-charger-cable',
      sku: 'ATAL-ELEC-CHG-07',
      brand: 'ATAL Tech',
      category_id: 'cat_electronics',
      subcategory_id: 'sub_cat_electronics_5',
      short_description: 'Compact 3-port GaN wall charger powering laptops, iPhones, and Androids at maximum speeds.',
      description: 'Features 2x USB-C PD 3.0 ports and 1x USB-A QC 4.0 port. Smart temperature management protects against voltage surges, heating, and overcharging. Comes with durable 2m Kevlar braided cable.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80'
      ]),
      purchase_price: 2100,
      original_price: 4999,
      sale_price: 3499,
      available_stock: 45,
      new_launch: 0,
      spotlight: 0,
      festive_deal: 0,
      festive_deal_order: 0,
      spotlight_order: 0,
      new_launch_order: 0,
      rating: 4.8,
      reviews_count: 92,
      variants: [
        { color: 'Midnight Black', hex: '#1e293b', size: '65W Standard', sku: 'GAN-65-BLK', price: 3499, stock: 45, img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80' }
      ]
    },
    {
      id: 'prod_008',
      name: 'Organic Damascus Rose Hydrating Face Serum',
      slug: 'damascus-rose-hydrating-serum',
      sku: 'ATAL-COSM-SRM-08',
      brand: 'Noor Botanicals',
      category_id: 'cat_cosmetics',
      subcategory_id: 'sub_cat_cosmetics_1',
      short_description: 'Hyaluronic acid and distilled rose water elixir for deep moisture and instant radiant glow.',
      description: 'Formulated with cold-pressed organic Damascus rose extract, niacinamide, and multi-molecular hyaluronic acid. Non-sticky, dermatologist-approved, and tailored for Pakistani weather conditions.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1608248597359-009c91f54467?auto=format&fit=crop&w=800&q=80'
      ]),
      purchase_price: 1100,
      original_price: 2999,
      sale_price: 1999,
      available_stock: 60,
      new_launch: 1,
      spotlight: 0,
      festive_deal: 0,
      festive_deal_order: 0,
      spotlight_order: 0,
      new_launch_order: 6,
      rating: 4.9,
      reviews_count: 115,
      variants: [
        { color: '30ml Dropper', hex: '#f43f5e', size: '30ml', sku: 'SRM-ROSE-30', price: 1999, stock: 60, img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80' }
      ]
    }
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (
      id, name, slug, sku, brand, category_id, subcategory_id, short_description, description, images,
      purchase_price, original_price, sale_price, currency, available_stock, low_stock_threshold,
      new_launch, spotlight, festive_deal, festive_deal_order, spotlight_order, new_launch_order,
      rating, reviews_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 'PKR', ?, 5,
      ?, ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  const insertVar = db.prepare(`
    INSERT INTO product_variants (id, product_id, color_name, color_code, size, sku, price, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    insertProd.run(
      p.id, p.name, p.slug, p.sku, p.brand, p.category_id, p.subcategory_id, p.short_description, p.description, p.images,
      p.purchase_price, p.original_price, p.sale_price, p.available_stock,
      p.new_launch, p.spotlight, p.festive_deal, p.festive_deal_order, p.spotlight_order, p.new_launch_order,
      p.rating, p.reviews_count
    );

    if (p.variants) {
      p.variants.forEach((v, idx) => {
        insertVar.run(
          `var_${p.id}_${idx + 1}`,
          p.id,
          v.color,
          v.hex,
          v.size,
          v.sku,
          v.price,
          v.stock,
          v.img
        );
      });
    }
  }

  // 7. Launch Soon Products (Section 7)
  const insertLaunchSoon = db.prepare(`
    INSERT INTO launch_soon (id, product_name, slug, short_description, image_url, expected_launch_date, countdown_target, coming_soon_badge, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLaunchSoon.run(
    'ls_001',
    'ATAL Smart Ring Gen 2 (Titanium & Ceramic)',
    'atal-smart-ring-gen-2',
    'Continuous sleep stages, HRV cardiovascular scoring, and contactless payments in an ultralight 4g ring.',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    'November 15, 2026',
    '2026-11-15T00:00:00.000Z',
    'Pre-Registration Open',
    1
  );

  insertLaunchSoon.run(
    'ls_002',
    'Heritage Pure Pashmina Kashmiri Chador',
    'heritage-pure-pashmina-kashmiri-chador',
    'Hand-spun Himalayan cashmere with sozni border needlework by generational artisans.',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    'November 28, 2026',
    '2026-11-28T00:00:00.000Z',
    'Limited Edition (100 Pcs)',
    2
  );

  insertLaunchSoon.run(
    'ls_003',
    'ATAL Studio Bar 400W Dolby Atmos Soundbar',
    'atal-studio-bar-400w-dolby-atmos',
    'Spatial 7.1.2 surround sound with wireless subwoofer and eARC high-definition cinema audio.',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    'December 10, 2026',
    '2026-12-10T00:00:00.000Z',
    'Coming Soon',
    3
  );

  // 8. Default Coupons
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_discount, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  insertCoupon.run('cp_01', 'ATAL10', 'percentage', 10, 2000, 1500);
  insertCoupon.run('cp_02', 'FESTIVE500', 'fixed', 500, 3500, 500);

  // 9. Initial Audit Log
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run('aud_001', 'system', 'SYSTEM_INIT', 'DATABASE', 'atal_store.db', JSON.stringify({ message: 'ATAL STORE database schema seeded with high fidelity Pakistani catalog and configurations.' }));
}

// Call initialization
initDatabase();
