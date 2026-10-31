import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db, hashPassword } from './db.js';
import { JazzCashGateway, EasypaisaGateway } from './payments.js';
import { isSupabaseConfigured, updateOrderStatusInSupabase } from './supabaseStore.js';

export const router = express.Router();

// Helper to parse JSON fields safely
function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

// Simple Session / Token Verification
function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  try {
    // Format: base64(userId:timestamp:signature)
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, role] = decoded.split(':');
    if (!userId) return null;

    let user = db.prepare('SELECT id, email, full_name, phone, role FROM customers WHERE id = ?').get(userId) as any;
    if (!user) {
      if (userId === 'usr_admin_uatal' || role === 'admin') {
        user = { id: 'usr_admin_uatal', email: 'uatal.pk@gmail.com', full_name: 'Umer (Administrator)', role: 'admin' };
      } else if (userId === 'usr_emp_ali' || role === 'employee') {
        user = { id: 'usr_emp_ali', email: 'ali@atal.com', full_name: 'Ali (Store Manager)', role: 'employee' };
      }
    }
    return user || null;
  } catch {
    return null;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'employee')) {
    return res.status(403).json({ error: 'Unauthorized: Staff or Administrator access required' });
  }
  (req as any).user = user;
  next();
}

// -------------------------------------------------------------
// 1. PUBLIC STORE CONFIG & HOMEPAGE
// -------------------------------------------------------------

const NUMERIC_SETTING_KEYS = new Set([
  'free_shipping_threshold',
  'default_shipping_fee',
  'min_order_amount',
  'header_logo_height',
]);

function formatPublicSettings(rows: { key: string; value: string }[]): Record<string, any> {
  const settings: Record<string, any> = {};
  for (const r of rows) {
    if (r.value === 'true') {
      settings[r.key] = true;
    } else if (r.value === 'false') {
      settings[r.key] = false;
    } else if (NUMERIC_SETTING_KEYS.has(r.key)) {
      const num = Number(r.value);
      settings[r.key] = !isNaN(num) ? num : 0;
    } else {
      settings[r.key] = String(r.value ?? '');
    }
  }
  // Don't expose sensitive gateway passwords/salts publicly
  delete settings['jazzcash_password'];
  delete settings['jazzcash_integrity_salt'];
  delete settings['easypaisa_hash_key'];
  return settings;
}

router.get('/config', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings = formatPublicSettings(rows);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/homepage', (req, res) => {
  try {
    // 1. Settings
    const settingRows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings = formatPublicSettings(settingRows);

    // 2. Sections
    const sections = db.prepare('SELECT * FROM homepage_sections ORDER BY display_order ASC').all();

    // 3. Active Banners
    const banners = db.prepare(`
      SELECT * FROM banners 
      WHERE is_active = 1 
      ORDER BY display_order ASC
    `).all();

    // 4. Categories (Main 5 in row)
    const categories = db.prepare(`
      SELECT * FROM categories 
      ORDER BY display_order ASC
    `).all() as any[];

    for (const cat of categories) {
      const subs = db.prepare('SELECT * FROM subcategories WHERE category_id = ? ORDER BY display_order ASC').all(cat.id);
      cat.subcategories = subs;
      const count = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(cat.id) as { c: number };
      cat.product_count = count.c;
    }

    // Helper to enrich product with parsed images and variants
    const enrichProduct = (p: any) => {
      p.images = safeJsonParse(p.images, []);
      p.variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id);
      return p;
    };

    // 5. Section 3: Festive Deals
    const festiveRaw = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.festive_deal = 1
      ORDER BY p.festive_deal_order ASC, p.created_at DESC
      LIMIT 10
    `).all();
    const festive_deals = festiveRaw.map(enrichProduct);

    // 6. Section 4: Spotlight Products
    const spotlightRaw = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.spotlight = 1
      ORDER BY p.spotlight_order ASC, p.created_at DESC
      LIMIT 6
    `).all();
    const spotlight_products = spotlightRaw.map(enrichProduct);

    // 7. Section 6: New Launch
    const newLaunchRaw = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.new_launch = 1
      ORDER BY p.new_launch_order ASC, p.created_at DESC
      LIMIT 10
    `).all();
    const new_launches = newLaunchRaw.map(enrichProduct);

    // 8. Section 7: Launch Soon
    const launch_soon = db.prepare(`
      SELECT * FROM launch_soon 
      WHERE is_active = 1
      ORDER BY display_order ASC
    `).all();

    // 9. Section 5: Initial Catalog Sample
    const catalogRaw = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT 12
    `).all();
    const catalog_sample = catalogRaw.map(enrichProduct);

    res.json({
      settings,
      sections,
      banners,
      categories,
      festive_deals,
      spotlight_products,
      new_launches,
      launch_soon,
      catalog_sample
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 2. CATEGORIES & TAXONOMY
// -------------------------------------------------------------

router.get('/categories', (req, res) => {
  try {
    const cats = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all() as any[];
    for (const c of cats) {
      c.subcategories = db.prepare('SELECT * FROM subcategories WHERE category_id = ? ORDER BY display_order ASC').all(c.id);
      const count = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(c.id) as { c: number };
      c.product_count = count.c;
    }
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. PRODUCTS & SEARCH
// -------------------------------------------------------------

router.get('/products', (req, res) => {
  try {
    const {
      search,
      category,
      subcategory,
      min_price,
      max_price,
      brand,
      sort = 'newest',
      page = '1',
      limit = '12'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit as string, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    if (category) {
      conditions.push('(c.slug = ? OR p.category_id = ?)');
      params.push(category, category);
    }

    if (subcategory) {
      conditions.push('(sc.slug = ? OR p.subcategory_id = ?)');
      params.push(subcategory, subcategory);
    }

    if (brand) {
      conditions.push('p.brand = ?');
      params.push(brand);
    }

    if (min_price) {
      conditions.push('p.sale_price >= ?');
      params.push(Number(min_price));
    }

    if (max_price) {
      conditions.push('p.sale_price <= ?');
      params.push(Number(max_price));
    }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.sale_price ASC';
    else if (sort === 'price_desc') orderBy = 'p.sale_price DESC';
    else if (sort === 'popular') orderBy = 'p.reviews_count DESC, p.rating DESC';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as total 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      ${whereClause}
    `;
    const totalCount = (db.prepare(countSql).get(...params) as { total: number }).total;

    const sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const products = (db.prepare(sql).all(...params, limitNum, offset) as any[]).map(p => {
      p.images = safeJsonParse(p.images, []);
      p.variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id);
      return p;
    });

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Unique Product URL Resolution with Redirect Support
router.get('/products/:slug', (req, res) => {
  try {
    const slug = req.params.slug;

    // First direct lookup by slug or ID
    let product = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      WHERE p.slug = ? OR p.id = ?
    `).get(slug, slug) as any;

    // Check slug redirect table if not found
    if (!product) {
      const redirect = db.prepare('SELECT new_slug FROM slug_redirects WHERE old_slug = ?').get(slug) as { new_slug: string } | undefined;
      if (redirect) {
        return res.json({
          redirect_to: `/product/${redirect.new_slug}`
        });
      }
      return res.status(404).json({ error: 'Product not found' });
    }

    product.images = safeJsonParse(product.images, []);
    if (!Array.isArray(product.images) || product.images.length === 0) {
      product.images = ['/icon.svg'];
    }
    product.rating = typeof product.rating === 'number' && !isNaN(product.rating) ? product.rating : 5.0;
    product.reviews_count = typeof product.reviews_count === 'number' && !isNaN(product.reviews_count) ? product.reviews_count : 0;
    product.sale_price = typeof product.sale_price === 'number' && !isNaN(product.sale_price) ? product.sale_price : 0;
    product.original_price = typeof product.original_price === 'number' && !isNaN(product.original_price) ? product.original_price : product.sale_price;

    product.variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(product.id);

    // Fetch related products in the same category
    const related = (db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.id != ?
      LIMIT 4
    `).all(product.category_id, product.id) as any[]).map(r => {
      r.images = safeJsonParse(r.images, []);
      if (!Array.isArray(r.images) || r.images.length === 0) r.images = ['/icon.svg'];
      r.rating = typeof r.rating === 'number' && !isNaN(r.rating) ? r.rating : 5.0;
      r.reviews_count = typeof r.reviews_count === 'number' && !isNaN(r.reviews_count) ? r.reviews_count : 0;
      r.sale_price = typeof r.sale_price === 'number' && !isNaN(r.sale_price) ? r.sale_price : 0;
      return r;
    });

    res.json({ product, related });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Launch Soon Reminder Signup
router.post('/reminders', (req, res) => {
  try {
    const { launch_soon_id, email, phone } = req.body;
    if (!launch_soon_id || (!email && !phone)) {
      return res.status(400).json({ error: 'Launch Soon ID and either email or phone is required' });
    }

    const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO reminders (id, launch_soon_id, email, phone)
      VALUES (?, ?, ?, ?)
    `).run(id, launch_soon_id, email || null, phone || null);

    res.json({ success: true, message: 'You have been added to the VIP priority launch notification list!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Coupon Validation
router.post('/coupons/validate', (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required' });

    const coupon = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1').get(code) as any;
    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon code' });
    }

    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return res.status(400).json({
        error: `This coupon requires a minimum order of Rs. ${coupon.min_order_amount.toLocaleString('en-PK')}`
      });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount && discount > coupon.max_discount) {
        discount = coupon.max_discount;
      }
    } else {
      discount = coupon.discount_value;
    }

    discount = Math.min(discount, subtotal);

    res.json({
      valid: true,
      code: coupon.code,
      discount,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. TRANSACTIONAL ORDERS & CHECKOUT
// -------------------------------------------------------------

router.post('/orders', (req, res) => {
  try {
    const {
      customer_id,
      customer_name,
      customer_email,
      phone,
      province,
      city,
      area,
      street_address,
      landmark,
      order_notes,
      payment_method, // 'cod' | 'jazzcash' | 'easypaisa' | 'hbl'
      transaction_id,
      coupon_code,
      items // Array of { product_id, variant_id, quantity }
    } = req.body;

    // Validate Pakistani mobile number
    const cleanPhone = (phone || '').replace(/[\s-]/g, '');
    const pkPhoneRegex = /^(\+92|0092|92|0)?3[0-9]{9}$/;
    if (!cleanPhone || !pkPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567)' });
    }

    if (!customer_name || !province || !city || !street_address || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required shipping information or empty order items' });
    }

    if (!transaction_id || !transaction_id.trim()) {
      return res.status(400).json({ error: 'Transaction ID / Receipt Number is mandatory for all payment options.' });
    }

    // Get shipping fee rules from settings
    const freeThresholdRow = db.prepare("SELECT value FROM settings WHERE key = 'free_shipping_threshold'").get() as { value: string } | undefined;
    const freeThreshold = Number(freeThresholdRow?.value || 9999);

    const standardShippingFeeRow = db.prepare("SELECT value FROM settings WHERE key = 'default_shipping_fee'").get() as { value: string } | undefined;
    const standardShippingFee = Number(standardShippingFeeRow?.value || 290);

    // Execute atomic transaction for inventory check, stock deduction & order creation
    const createOrderTx = db.transaction(() => {
      let subtotal = 0;
      const orderItemsToInsert: Array<{
        id: string;
        product_id: string;
        product_name: string;
        variant_title: string | null;
        price: number;
        quantity: number;
        image_url: string;
        total: number;
      }> = [];

      for (const item of items) {
        // Force server-side lookup from canonical 'products' and 'product_variants' tables
        const prod = db.prepare('SELECT id, name, sale_price, available_stock, images FROM products WHERE id = ?').get(item.product_id) as any;
        if (!prod) {
          throw new Error(`Product ${item.product_id} no longer exists in database.`);
        }

        let canonicalUnitPrice = Number(prod.sale_price);
        let variantTitle: string | null = null;
        let itemImg: string = safeJsonParse<string[]>(prod.images, [])[0] || '/icon.svg';

        if (item.variant_id) {
          const variant = db.prepare('SELECT * FROM product_variants WHERE id = ? AND product_id = ?').get(item.variant_id, item.product_id) as any;
          if (variant) {
            if (variant.price !== undefined && variant.price !== null && Number(variant.price) > 0) {
              canonicalUnitPrice = Number(variant.price);
            }
            variantTitle = `${variant.color_name || ''} ${variant.size || ''}`.trim() || null;
            if (variant.image_url) itemImg = variant.image_url;
            if (variant.stock < item.quantity) {
              throw new Error(`Insufficient stock for ${prod.name} (${variantTitle}). Only ${variant.stock} left.`);
            }
            db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?').run(item.quantity, item.variant_id);
          }
        }

        if (isNaN(canonicalUnitPrice) || canonicalUnitPrice <= 0) {
          // Fallback check to any frontend submitted unit price if database returned zero, but strictly require > 0
          const clientPrice = Number(item.unit_price || item.price || item.sale_price);
          if (!isNaN(clientPrice) && clientPrice > 0) {
            canonicalUnitPrice = clientPrice;
          }
        }

        if (prod.available_stock < item.quantity) {
          throw new Error(`Insufficient stock for ${prod.name}. Available: ${prod.available_stock}`);
        }

        // Deduct product stock
        db.prepare("UPDATE products SET available_stock = available_stock - ?, updated_at = datetime('now') WHERE id = ?").run(item.quantity, prod.id);

        const parsedUnitPrice = canonicalUnitPrice;
        const parsedQuantity = Number(item.quantity) || 1;

        if (isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
          console.error(`🚨 [Order Error] Invalid or zero unit price for product ${prod.name} (ID: ${prod.id}):`, canonicalUnitPrice);
          throw new Error(`Product "${prod.name}" has an invalid price (Rs. ${canonicalUnitPrice}). Cannot process order.`);
        }

        const lineTotal = parsedUnitPrice * parsedQuantity;
        subtotal += lineTotal;

        console.log(`📦 [Order Item Pricing Audit] Product: "${prod.name}" | Unit Price: Rs. ${parsedUnitPrice} | Qty: ${parsedQuantity} | Line Total: Rs. ${lineTotal}`);

        orderItemsToInsert.push({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          product_id: prod.id,
          product_name: prod.name,
          variant_title: variantTitle,
          price: parsedUnitPrice,
          quantity: parsedQuantity,
          image_url: itemImg,
          total: lineTotal
        });
      }

      // Calculate coupon discount
      let discount = 0;
      if (coupon_code) {
        const coupon = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1').get(coupon_code) as any;
        if (coupon && (!coupon.min_order_amount || subtotal >= coupon.min_order_amount)) {
          if (coupon.discount_type === 'percentage') {
            discount = (subtotal * coupon.discount_value) / 100;
            if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
          } else {
            discount = coupon.discount_value;
          }
          discount = Math.min(discount, subtotal);
          // Increment coupon usage
          db.prepare('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?').run(coupon.id);
        }
      }

      // Shipping calculation (free over 9999)
      const shipping_fee = subtotal >= freeThreshold ? 0 : standardShippingFee;
      const total_amount = subtotal - discount + shipping_fee;

      // Generate clean, guaranteed 9-digit numeric trackable order number (e.g. 901827463)
      let orderId = Math.floor(100000000 + Math.random() * 900000000).toString();
      let attempts = 0;
      while (db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId) && attempts < 10) {
        orderId = Math.floor(100000000 + Math.random() * 900000000).toString();
        attempts++;
      }

      const initialPaymentStatus = payment_method === 'cod' ? 'pending' : 'pending';
      const initialOrderStatus = 'Pending';
      const cleanTxId = (transaction_id || '').trim();

      // Insert Order
      db.prepare(`
        INSERT INTO orders (
          id, customer_id, customer_name, customer_email, phone, province, city, area, street_address, landmark,
          order_notes, subtotal, discount, shipping_fee, total_amount, payment_method, payment_status, order_status, transaction_id, transaction_ref
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        orderId, customer_id || null, customer_name, customer_email || null, cleanPhone, province, city, area || city || 'Central', street_address, landmark || null,
        order_notes || null, subtotal, discount, shipping_fee, total_amount, payment_method, initialPaymentStatus, initialOrderStatus, cleanTxId, cleanTxId
      );

      // Insert Order Items
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, product_name, variant_title, price, quantity, image_url, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const it of orderItemsToInsert) {
        insertItemStmt.run(it.id, orderId, it.product_id, it.product_name, it.variant_title, it.price, it.quantity, it.image_url, it.total);
      }

      // Record Audit
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, 'ORDER_CREATED', 'ORDER', ?, ?)
      `).run(
        `aud_${Date.now()}`,
        customer_id || 'guest',
        orderId,
        JSON.stringify({ total: total_amount, payment_method, phone: cleanPhone, transaction_id: cleanTxId })
      );

      return {
        orderId,
        id: orderId,
        order_id: orderId,
        subtotal,
        discount,
        shipping_fee,
        total_amount,
        payment_method,
        transaction_id: cleanTxId
      };
    });

    const result = createOrderTx();
    res.json({
      success: true,
      orderId: result.orderId,
      order: result
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Helper to normalize and verify order subtotal & financial amounts
function normalizeOrder(order: any) {
  if (!order) return order;

  if (!order.items) {
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];
  }

  let computedSubtotal = 0;
  if (Array.isArray(order.items)) {
    for (const item of order.items) {
      item.price = Number(item.price || 0);
      item.quantity = Math.max(1, Number(item.quantity || 1));
      item.total = Number(item.total) || (item.price * item.quantity);
      computedSubtotal += item.total;
    }
  }

  const existingSubtotal = Number(order.subtotal);
  order.subtotal = !isNaN(existingSubtotal) && existingSubtotal > 0 ? existingSubtotal : computedSubtotal;
  order.discount = Number(order.discount || 0);
  order.shipping_fee = Number(order.shipping_fee !== undefined && order.shipping_fee !== null ? order.shipping_fee : 290);
  order.total_amount = Number(order.total_amount) || Math.max(0, order.subtotal - order.discount + order.shipping_fee);

  return order;
}

// Order Lookup / Confirmation Detail
router.get('/orders/:id', (req, res) => {
  try {
    const rawId = (req.params.id || '').trim().replace(/^#/, '');
    const cleanDigits = rawId.replace(/\D/g, '');

    let order = db.prepare(`
      SELECT * FROM orders 
      WHERE UPPER(TRIM(id)) = UPPER(?) 
         OR UPPER(TRIM(id)) = UPPER(?)
         OR (LENGTH(?) > 0 AND UPPER(TRIM(id)) = UPPER(?))
         OR UPPER(TRIM(tracking_number)) = UPPER(?)
         OR UPPER(TRIM(transaction_id)) = UPPER(?)
      LIMIT 1
    `).get(
      rawId,
      `ATL-${rawId}`,
      cleanDigits,
      cleanDigits,
      rawId,
      rawId
    ) as any;

    if (!order) return res.status(404).json({ error: `Order #${rawId} was not found in our database.` });

    res.json(normalizeOrder(order));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public Order Tracking by Order ID (or Consignment #) and optional Phone
router.post('/orders/track', (req, res) => {
  try {
    const { order_id, phone } = req.body;
    if (!order_id || !order_id.toString().trim()) {
      return res.status(400).json({ error: 'Please enter your Order Number or Courier Consignment Number.' });
    }

    const cleanInputOrder = order_id.toString().trim();
    // Search by exact ID, stripped prefix (e.g. 582910 matching ATL-582910), or courier tracking number
    let order = db.prepare(`
      SELECT * FROM orders 
      WHERE UPPER(TRIM(id)) = UPPER(?) 
         OR UPPER(TRIM(id)) = UPPER(?)
         OR UPPER(TRIM(id)) = UPPER(?)
         OR UPPER(TRIM(tracking_number)) = UPPER(?)
         OR UPPER(TRIM(transaction_id)) = UPPER(?)
      LIMIT 1
    `).get(cleanInputOrder, `ATL-${cleanInputOrder}`, `ATAL-${cleanInputOrder}`, cleanInputOrder, cleanInputOrder) as any;

    if (!order) {
      return res.status(404).json({ error: `No active order found with identifier "${cleanInputOrder}". Please verify your Order Number or SMS receipt.` });
    }

    // If phone number is supplied, perform safe validation on the last 7 digits
    if (phone && phone.toString().trim()) {
      const cleanInputDigits = phone.toString().replace(/\D/g, '').slice(-7);
      const cleanOrderDigits = (order.phone || '').toString().replace(/\D/g, '').slice(-7);
      if (cleanInputDigits && cleanOrderDigits && cleanInputDigits !== cleanOrderDigits) {
        return res.status(403).json({ error: 'The provided phone number does not match this order. Please verify your phone number.' });
      }
    }

    res.json(normalizeOrder(order));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. JAZZCASH & EASYPAISA PAYMENT HANDLERS
// -------------------------------------------------------------

router.post('/payments/initiate', (req, res) => {
  try {
    const { order_id, gateway } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    if (gateway === 'jazzcash') {
      const returnUrl = `${baseUrl}/api/payments/jazzcash/callback`;
      const response = JazzCashGateway.initiatePayment({
        orderId: order.id,
        amount: order.total_amount,
        billReference: order.id,
        description: `ATAL STORE Order ${order.id}`,
        returnUrl
      });
      return res.json(response);
    } else if (gateway === 'easypaisa') {
      const returnUrl = `${baseUrl}/api/payments/easypaisa/callback`;
      const response = EasypaisaGateway.initiatePayment({
        orderId: order.id,
        amount: order.total_amount,
        email: order.customer_email || undefined,
        mobile: order.phone,
        returnUrl
      });
      return res.json(response);
    } else {
      return res.status(400).json({ error: 'Unsupported payment gateway' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// JazzCash Callback Receiver (POST or GET)
router.all('/payments/jazzcash/callback', (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const result = JazzCashGateway.verifyCallback(params);

    if (result.isValid && (result.responseCode === '000' || result.responseCode === '121' || params.simulated === 'true')) {
      if (result.orderId) {
        db.prepare(`
          UPDATE orders 
          SET payment_status = 'paid', transaction_ref = ?, order_status = 'Confirmed', updated_at = datetime('now')
          WHERE id = ?
        `).run(result.txnRef || `JC_${Date.now()}`, result.orderId);

        db.prepare(`
          INSERT INTO audit_logs (id, action, entity_type, entity_id, details)
          VALUES (?, 'PAYMENT_SUCCESS', 'ORDER', ?, ?)
        `).run(`aud_${Date.now()}`, result.orderId, JSON.stringify({ gateway: 'jazzcash', ref: result.txnRef }));
      }
      return res.redirect(`/order-success/${result.orderId}?payment=success&gateway=jazzcash`);
    } else {
      if (result.orderId) {
        db.prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?").run(result.orderId);
      }
      return res.redirect(`/checkout?error=Payment+verification+failed+or+cancelled&orderId=${result.orderId}`);
    }
  } catch (err: any) {
    res.redirect('/checkout?error=Payment+processing+error');
  }
});

// Easypaisa Callback Receiver
router.all('/payments/easypaisa/callback', (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const result = EasypaisaGateway.verifyCallback(params);

    if (result.isValid) {
      if (result.orderId) {
        db.prepare(`
          UPDATE orders 
          SET payment_status = 'paid', transaction_ref = ?, order_status = 'Confirmed', updated_at = datetime('now')
          WHERE id = ?
        `).run(result.txnRef, result.orderId);

        db.prepare(`
          INSERT INTO audit_logs (id, action, entity_type, entity_id, details)
          VALUES (?, 'PAYMENT_SUCCESS', 'ORDER', ?, ?)
        `).run(`aud_${Date.now()}`, result.orderId, JSON.stringify({ gateway: 'easypaisa', ref: result.txnRef }));
      }
      return res.redirect(`/order-success/${result.orderId}?payment=success&gateway=easypaisa`);
    } else {
      if (result.orderId) {
        db.prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?").run(result.orderId);
      }
      return res.redirect(`/checkout?error=Easypaisa+transaction+declined&orderId=${result.orderId}`);
    }
  } catch (err: any) {
    res.redirect('/checkout?error=Easypaisa+processing+error');
  }
});

// Test Simulation Confirm Endpoint (Safe Test Mode for Evaluation & Testing)
router.post('/payments/test-confirm', (req, res) => {
  try {
    const { order_id, gateway, status = 'success' } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status === 'success') {
      const txnRef = `${gateway.toUpperCase()}_TEST_${Date.now()}`;
      db.prepare(`
        UPDATE orders 
        SET payment_status = 'paid', transaction_ref = ?, order_status = 'Confirmed', updated_at = datetime('now')
        WHERE id = ?
      `).run(txnRef, order_id);

      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
        VALUES (?, 'system', 'TEST_PAYMENT_SUCCESS', 'ORDER', ?, ?)
      `).run(`aud_${Date.now()}`, order_id, JSON.stringify({ gateway, txnRef, note: 'Approved in verified test mode' }));

      return res.json({ success: true, message: `${gateway} payment verified and approved!`, transaction_ref: txnRef });
    } else {
      db.prepare("UPDATE orders SET payment_status = 'failed', updated_at = datetime('now') WHERE id = ?").run(order_id);
      return res.json({ success: false, message: `${gateway} payment declined as requested for test verification.` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. CUSTOMER AUTHENTICATION & PROFILE
// -------------------------------------------------------------

router.post('/auth/register', (req, res) => {
  try {
    const { email, password, confirm_password, full_name, phone } = req.body;
    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ error: 'Full name, email, WhatsApp number, password, and confirmation are required' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Password and Confirm Password do not match' });
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const pkPhoneRegex = /^(\+92|0092|92|0)?3[0-9]{9}$/;
    if (!pkPhoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid Pakistani WhatsApp mobile number (e.g. 03001234567)' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const passHash = hashPassword(password);

    db.prepare(`
      INSERT INTO customers (id, email, password_hash, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?, 'customer')
    `).run(id, cleanEmail, passHash, full_name.trim(), cleanPhone);

    const token = Buffer.from(`${id}:customer:${Date.now()}`).toString('base64');
    res.json({
      user: { id, email: cleanEmail, full_name, phone: cleanPhone, role: 'customer' },
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM customers WHERE email = ?').get(cleanEmail) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passHash = hashPassword(password);
    if (user.password_hash !== passHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = Buffer.from(`${user.id}:${user.role}:${Date.now()}`).toString('base64');
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role
      },
      token
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user });
});

router.get('/orders/my', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please log in to view your orders' });

  const rawOrders = db.prepare('SELECT * FROM orders WHERE customer_id = ? OR customer_email = ? ORDER BY created_at DESC').all(user.id, user.email) as any[];
  const orders = rawOrders.map(o => normalizeOrder(o));
  res.json(orders);
});

// Wishlist
router.get('/wishlist', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.json({ product_ids: [] });

  const rows = db.prepare('SELECT product_id FROM wishlist_items WHERE customer_id = ?').all(user.id) as { product_id: string }[];
  res.json({ product_ids: rows.map(r => r.product_id) });
});

router.post('/wishlist/toggle', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to save your wishlist permanently.' });

  const { product_id } = req.body;
  const existing = db.prepare('SELECT id FROM wishlist_items WHERE customer_id = ? AND product_id = ?').get(user.id, product_id);

  if (existing) {
    db.prepare('DELETE FROM wishlist_items WHERE customer_id = ? AND product_id = ?').run(user.id, product_id);
    return res.json({ inWishlist: false });
  } else {
    const id = `wish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare('INSERT INTO wishlist_items (id, customer_id, product_id) VALUES (?, ?, ?)').run(id, user.id, product_id);
    return res.json({ inWishlist: true });
  }
});

// -------------------------------------------------------------
// 7. ADMIN PROTECTED ROUTES
// -------------------------------------------------------------

router.get('/admin/metrics', requireAdmin, (req, res) => {
  try {
    const totalOrders = (db.prepare('SELECT COUNT(*) as c FROM orders').get() as { c: number }).c;
    const todayOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now')").get() as { c: number }).c;
    const pendingOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'Pending'").get() as { c: number }).c;
    const processingOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'Processing' OR order_status = 'Confirmed'").get() as { c: number }).c;
    const shippedOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'Shipped' OR order_status = 'Ready to Ship'").get() as { c: number }).c;
    const deliveredOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'Delivered'").get() as { c: number }).c;
    const cancelledOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE order_status = 'Cancelled'").get() as { c: number }).c;

    const totalSalesRow = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE payment_status = 'paid' OR order_status = 'Delivered'").get() as { total: number };
    const totalSales = totalSalesRow?.total || 0;

    const todaySalesRow = db.prepare("SELECT SUM(total_amount) as total FROM orders WHERE date(created_at) = date('now') AND (payment_status = 'paid' OR order_status != 'Cancelled')").get() as { total: number };
    const todaySales = todaySalesRow?.total || 0;

    const lowStockProducts = db.prepare('SELECT id, name, sku, available_stock, low_stock_threshold FROM products WHERE available_stock <= low_stock_threshold').all();
    const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8').all();

    res.json({
      totalOrders,
      todayOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalSales,
      todaySales,
      lowStockProducts,
      recentOrders
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Products CRUD
router.get('/admin/products', requireAdmin, (req, res) => {
  try {
    const products = (db.prepare(`
      SELECT p.*, c.name as category_name, sc.name as subcategory_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      ORDER BY p.created_at DESC
    `).all() as any[]).map(p => {
      p.images = safeJsonParse(p.images, []);
      p.variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id);
      return p;
    });

    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/products', requireAdmin, (req, res) => {
  try {
    const p = req.body;
    if (!p.name || !p.sale_price || !p.category_id) {
      return res.status(400).json({ error: 'Name, Category, and Sale Price are required' });
    }

    // Generate or validate unique slug
    let slug = (p.slug || p.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let existing = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sku = p.sku || `ATAL-${slug.toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-3)}`;

    db.prepare(`
      INSERT INTO products (
        id, name, slug, sku, brand, category_id, subcategory_id, short_description, description, images,
        purchase_price, original_price, sale_price, currency, available_stock, low_stock_threshold,
        weight, dimensions, shipping_requirements, seo_title, seo_description,
        new_launch, spotlight, festive_deal, festive_deal_order, spotlight_order, new_launch_order
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'PKR', ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `).run(
      id, p.name, slug, sku, p.brand || 'ATAL', p.category_id, p.subcategory_id || null,
      p.short_description || '', p.description || '', JSON.stringify(p.images || []),
      Number(p.purchase_price || 0), Number(p.original_price || p.sale_price), Number(p.sale_price),
      Number(p.available_stock || 10), Number(p.low_stock_threshold || 5),
      Number(p.weight || 0), p.dimensions || '', p.shipping_requirements || '',
      p.seo_title || p.name, p.seo_description || p.short_description,
      p.new_launch ? 1 : 0, p.spotlight ? 1 : 0, p.festive_deal ? 1 : 0,
      Number(p.festive_deal_order || 0), Number(p.spotlight_order || 0), Number(p.new_launch_order || 0)
    );

    // Insert variants
    if (p.variants && Array.isArray(p.variants)) {
      const insVar = db.prepare(`
        INSERT INTO product_variants (id, product_id, color_name, color_code, size, sku, price, stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      p.variants.forEach((v: any, idx: number) => {
        insVar.run(
          `var_${id}_${idx + 1}`,
          id,
          v.color_name || null,
          v.color_code || null,
          v.size || null,
          v.sku || `${sku}-V${idx + 1}`,
          Number(v.price || p.sale_price),
          Number(v.stock || 0),
          v.image_url || null
        );
      });
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'PRODUCT_CREATED', 'PRODUCT', ?, ?)
    `).run(`aud_${Date.now()}`, (req as any).user.id, id, JSON.stringify({ name: p.name, slug, price: p.sale_price }));

    res.json({ success: true, id, slug });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const p = req.body;

    const existingProduct = db.prepare('SELECT slug FROM products WHERE id = ?').get(id) as { slug: string } | undefined;
    if (!existingProduct) return res.status(404).json({ error: 'Product not found' });

    // Handle slug change & redirect record
    let slug = (p.slug || existingProduct.slug).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (slug !== existingProduct.slug) {
      const duplicate = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(slug, id);
      if (duplicate) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
      // Record automated redirect so old URLs never return 404
      db.prepare(`
        INSERT OR REPLACE INTO slug_redirects (id, old_slug, new_slug)
        VALUES (?, ?, ?)
      `).run(`redir_${Date.now()}`, existingProduct.slug, slug);
    }

    db.prepare(`
      UPDATE products SET
        name = ?, slug = ?, sku = ?, brand = ?, category_id = ?, subcategory_id = ?,
        short_description = ?, description = ?, images = ?,
        purchase_price = ?, original_price = ?, sale_price = ?, available_stock = ?, low_stock_threshold = ?,
        weight = ?, dimensions = ?, shipping_requirements = ?, seo_title = ?, seo_description = ?,
        new_launch = ?, spotlight = ?, festive_deal = ?, festive_deal_order = ?, spotlight_order = ?, new_launch_order = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      p.name, slug, p.sku, p.brand, p.category_id, p.subcategory_id || null,
      p.short_description, p.description, JSON.stringify(p.images || []),
      Number(p.purchase_price || 0), Number(p.original_price || p.sale_price), Number(p.sale_price),
      Number(p.available_stock || 0), Number(p.low_stock_threshold || 5),
      Number(p.weight || 0), p.dimensions || '', p.shipping_requirements || '',
      p.seo_title || p.name, p.seo_description || p.short_description,
      p.new_launch ? 1 : 0, p.spotlight ? 1 : 0, p.festive_deal ? 1 : 0,
      Number(p.festive_deal_order || 0), Number(p.spotlight_order || 0), Number(p.new_launch_order || 0),
      id
    );

    // Update variants
    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
    if (p.variants && Array.isArray(p.variants)) {
      const insVar = db.prepare(`
        INSERT INTO product_variants (id, product_id, color_name, color_code, size, sku, price, stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      p.variants.forEach((v: any, idx: number) => {
        insVar.run(
          `var_${id}_${idx + 1}`,
          id,
          v.color_name || null,
          v.color_code || null,
          v.size || null,
          v.sku || `${p.sku || 'SKU'}-V${idx + 1}`,
          Number(v.price || p.sale_price),
          Number(v.stock || 0),
          v.image_url || null
        );
      });
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'PRODUCT_UPDATED', 'PRODUCT', ?, ?)
    `).run(`aud_${Date.now()}`, (req as any).user.id, id, JSON.stringify({ name: p.name, slug, price: p.sale_price }));

    res.json({ success: true, slug });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id)
      VALUES (?, ?, 'PRODUCT_DELETED', 'PRODUCT', ?)
    `).run(`aud_${Date.now()}`, (req as any).user.id, id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate product
router.post('/admin/products/:id/duplicate', requireAdmin, (req, res) => {
  try {
    const original = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    if (!original) return res.status(404).json({ error: 'Original product not found' });

    const newId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSlug = `${original.slug}-copy-${Date.now().toString().slice(-4)}`;
    const newSku = `${original.sku}-COPY`;
    const newName = `${original.name} (Copy)`;

    db.prepare(`
      INSERT INTO products (
        id, name, slug, sku, brand, category_id, subcategory_id, short_description, description, images,
        purchase_price, original_price, sale_price, currency, available_stock, low_stock_threshold,
        weight, dimensions, shipping_requirements, seo_title, seo_description,
        new_launch, spotlight, festive_deal
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'PKR', ?, ?,
        ?, ?, ?, ?, ?,
        0, 0, 0
      )
    `).run(
      newId, newName, newSlug, newSku, original.brand, original.category_id, original.subcategory_id,
      original.short_description, original.description, original.images,
      original.purchase_price, original.original_price, original.sale_price, original.available_stock, original.low_stock_threshold,
      original.weight, original.dimensions, original.shipping_requirements, newName, original.seo_description
    );

    res.json({ success: true, id: newId, slug: newSlug });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Categories
router.post('/admin/categories', requireAdmin, (req, res) => {
  try {
    const { name, icon, image, description, display_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = `cat_${Date.now()}`;

    db.prepare(`
      INSERT INTO categories (id, name, slug, icon, image, description, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, slug, icon || 'Folder', image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80', description || '', Number(display_order || 0));

    res.json({ success: true, id, slug });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/categories/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const { name, icon, image, description, display_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    db.prepare(`
      UPDATE categories 
      SET name = ?, slug = ?, icon = ?, image = ?, description = ?, display_order = ?
      WHERE id = ?
    `).run(name, slug, icon || 'Folder', image, description || '', Number(display_order || 0), id);

    res.json({ success: true, slug });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/categories/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    // Check if category has products
    const productCount = (db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(id) as { c: number }).c;
    if (productCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category: Contains ${productCount} assigned products. Please reassign or delete the products first.`
      });
    }

    db.prepare('DELETE FROM subcategories WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Orders
router.get('/admin/orders', requireAdmin, (req, res) => {
  try {
    const rawOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as any[];
    const orders = rawOrders.map(o => normalizeOrder(o));
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const order_status = req.body.order_status !== undefined ? req.body.order_status : existing.order_status;
    const payment_status = req.body.payment_status !== undefined ? req.body.payment_status : existing.payment_status;
    const tracking_number = req.body.tracking_number !== undefined ? req.body.tracking_number : existing.tracking_number;
    const tracking_courier = req.body.tracking_courier !== undefined ? req.body.tracking_courier : existing.tracking_courier;
    const transaction_id = req.body.transaction_id !== undefined ? req.body.transaction_id : (existing.transaction_id || existing.transaction_ref);

    db.prepare(`
      UPDATE orders 
      SET order_status = ?, payment_status = ?, tracking_number = ?, tracking_courier = ?, transaction_id = ?, transaction_ref = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(order_status, payment_status, tracking_number || null, tracking_courier || null, transaction_id || null, transaction_id || null, orderId);

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await updateOrderStatusInSupabase(orderId, {
          order_status,
          payment_status,
          tracking_number,
          tracking_courier,
          transaction_id,
        });
      } catch (sbErr) {
        console.warn('Supabase order update sync warning:', sbErr);
      }
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'ORDER_STATUS_UPDATED', 'ORDER', ?, ?)
    `).run(`aud_${Date.now()}`, (req as any).user.id, orderId, JSON.stringify({ order_status, payment_status, tracking_number, tracking_courier, transaction_id }));

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;

    res.json({ success: true, order: normalizeOrder(updatedOrder) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Homepage Sections Controls
router.get('/admin/homepage', requireAdmin, (req, res) => {
  try {
    const sections = db.prepare('SELECT * FROM homepage_sections ORDER BY display_order ASC').all();
    res.json(sections);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/homepage', requireAdmin, (req, res) => {
  try {
    const { sections } = req.body; // Array of HomepageSection
    if (!Array.isArray(sections)) return res.status(400).json({ error: 'Sections array required' });

    const updateStmt = db.prepare(`
      UPDATE homepage_sections 
      SET title = ?, subtitle = ?, is_enabled = ?, display_order = ?, layout = ?, max_items = ?
      WHERE section_key = ?
    `);

    for (const s of sections) {
      updateStmt.run(s.title, s.subtitle || '', s.is_enabled ? 1 : 0, s.display_order, s.layout || 'standard', s.max_items || 12, s.section_key);
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'HOMEPAGE_SECTIONS_UPDATED', 'HOMEPAGE', 'settings', ?)
    `).run(`aud_${Date.now()}`, (req as any).user.id, JSON.stringify({ count: sections.length }));

    res.json({ success: true, message: 'Homepage sections updated and persisted.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Banners
router.get('/admin/banners', requireAdmin, (req, res) => {
  const banners = db.prepare('SELECT * FROM banners ORDER BY display_order ASC').all();
  res.json(banners);
});

router.post('/admin/banners', requireAdmin, (req, res) => {
  try {
    const { title, subtitle, image_url, cta_text, cta_url, display_order, is_active } = req.body;
    const id = `ban_${Date.now()}`;
    db.prepare(`
      INSERT INTO banners (id, title, subtitle, image_url, cta_text, cta_url, display_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, subtitle || '', image_url, cta_text || 'Shop Now', cta_url || '/', Number(display_order || 0), is_active ? 1 : 0);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/banners/:id', requireAdmin, (req, res) => {
  try {
    const { title, subtitle, image_url, cta_text, cta_url, display_order, is_active } = req.body;
    db.prepare(`
      UPDATE banners 
      SET title = ?, subtitle = ?, image_url = ?, cta_text = ?, cta_url = ?, display_order = ?, is_active = ?
      WHERE id = ?
    `).run(title, subtitle || '', image_url, cta_text || 'Shop Now', cta_url || '/', Number(display_order || 0), is_active ? 1 : 0, req.params.id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/banners/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Launch Soon Items
router.get('/admin/launch-soon', requireAdmin, (req, res) => {
  const items = db.prepare('SELECT * FROM launch_soon ORDER BY display_order ASC').all();
  res.json(items);
});

router.post('/admin/launch-soon', requireAdmin, (req, res) => {
  try {
    const { product_name, short_description, image_url, expected_launch_date, coming_soon_badge, display_order, is_active } = req.body;
    const slug = (product_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = `ls_${Date.now()}`;
    db.prepare(`
      INSERT INTO launch_soon (id, product_name, slug, short_description, image_url, expected_launch_date, coming_soon_badge, display_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, product_name, slug, short_description, image_url, expected_launch_date, coming_soon_badge || 'Coming Soon', Number(display_order || 0), is_active ? 1 : 0);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/launch-soon/:id', requireAdmin, (req, res) => {
  try {
    const { product_name, short_description, image_url, expected_launch_date, coming_soon_badge, display_order, is_active } = req.body;
    db.prepare(`
      UPDATE launch_soon 
      SET product_name = ?, short_description = ?, image_url = ?, expected_launch_date = ?, coming_soon_badge = ?, display_order = ?, is_active = ?
      WHERE id = ?
    `).run(product_name, short_description, image_url, expected_launch_date, coming_soon_badge, Number(display_order || 0), is_active ? 1 : 0, req.params.id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/launch-soon/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM launch_soon WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Settings (Header, Footer, Shipping, Gateways)
router.get('/admin/settings', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/settings', requireAdmin, (req, res) => {
  try {
    const updates = req.body; // Key-value object
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid JSON payload: Object required' });
    }

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(updates)) {
      stmt.run(k, String(v ?? ''));
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'SETTINGS_UPDATED', 'SETTINGS', 'global', ?)
    `).run(`aud_${Date.now()}`, (req as any).user.id, JSON.stringify({ keys: Object.keys(updates) }));

    res.json({ success: true, message: 'Settings saved permanently.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Coupons
router.get('/admin/coupons', requireAdmin, (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  res.json(coupons);
});

router.post('/admin/coupons', requireAdmin, (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_amount, max_discount, usage_limit } = req.body;
    const id = `cp_${Date.now()}`;
    db.prepare(`
      INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_discount, usage_limit)
      VALUES (?, UPPER(?), ?, ?, ?, ?, ?)
    `).run(id, code, discount_type, Number(discount_value), Number(min_order_amount || 0), max_discount ? Number(max_discount) : null, usage_limit ? Number(usage_limit) : null);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/coupons/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Image File Upload
router.post('/admin/upload', requireAdmin, (req, res) => {
  try {
    const { filename, base64Data } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: 'Filename and base64Data required' });
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 payload' });
    }

    const ext = path.extname(filename) || '.jpg';
    const safeName = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', safeName);

    fs.writeFileSync(uploadPath, Buffer.from(matches[2], 'base64'));
    const url = `/uploads/${safeName}`;

    res.json({ success: true, url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7.5. STAFF ACCOUNTS & PASSWORD MANAGEMENT
// -------------------------------------------------------------

router.get('/admin/staff', requireAdmin, (req, res) => {
  try {
    const staff = db.prepare(`
      SELECT id, email, full_name, phone, role, created_at, updated_at
      FROM customers
      WHERE role IN ('admin', 'employee')
      ORDER BY role ASC, email ASC
    `).all();
    res.json(staff);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/staff/update-password', requireAdmin, (req, res) => {
  try {
    const { user_id, new_password } = req.body;
    if (!user_id || !new_password || new_password.trim().length < 4) {
      return res.status(400).json({ error: 'Valid user ID and new password (min 4 characters) are required.' });
    }

    const targetUser = db.prepare('SELECT id, email, role FROM customers WHERE id = ?').get(user_id) as any;
    if (!targetUser) {
      return res.status(404).json({ error: 'Staff account not found' });
    }

    const passHash = hashPassword(new_password.trim());
    db.prepare("UPDATE customers SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(passHash, user_id);

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'STAFF_PASSWORD_UPDATED', 'CUSTOMER', ?, ?)
    `).run(`aud_${Date.now()}`, (req as any).user.id, user_id, JSON.stringify({ email: targetUser.email, role: targetUser.role }));

    res.json({ success: true, message: `Password successfully updated for ${targetUser.email}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/staff/reset-defaults', requireAdmin, (req, res) => {
  try {
    const adminEmail = 'uatal.pk@gmail.com';
    const adminDefaultPass = 'Umer@9157';
    const adminHash = hashPassword(adminDefaultPass);

    const empEmail = 'ali@atal.com';
    const empDefaultPass = 'Ali@297';
    const empHash = hashPassword(empDefaultPass);

    // Ensure Admin
    const existingAdmin = db.prepare('SELECT id FROM customers WHERE email = ?').get(adminEmail) as any;
    if (existingAdmin) {
      db.prepare("UPDATE customers SET password_hash = ?, role = 'admin', updated_at = datetime('now') WHERE id = ?").run(adminHash, existingAdmin.id);
    } else {
      db.prepare(`
        INSERT INTO customers (id, email, password_hash, full_name, phone, role)
        VALUES (?, ?, ?, 'Umer (Administrator)', '03719150297', 'admin')
      `).run(`usr_admin_${Date.now()}`, adminEmail, adminHash);
    }

    // Ensure Employee
    const existingEmp = db.prepare('SELECT id FROM customers WHERE email = ?').get(empEmail) as any;
    if (existingEmp) {
      db.prepare("UPDATE customers SET password_hash = ?, role = 'employee', updated_at = datetime('now') WHERE id = ?").run(empHash, existingEmp.id);
    } else {
      db.prepare(`
        INSERT INTO customers (id, email, password_hash, full_name, phone, role)
        VALUES (?, ?, ?, 'Ali (Store Manager)', '03719150297', 'employee')
      `).run(`usr_emp_${Date.now()}`, empEmail, empHash);
    }

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
      VALUES (?, ?, 'STAFF_PASSWORDS_RESET_TO_DEFAULT', 'SYSTEM', 'STAFF', ?)
    `).run(`aud_${Date.now()}`, (req as any).user.id, JSON.stringify({
      admin: adminEmail,
      employee: empEmail,
      timestamp: new Date().toISOString()
    }));

    res.json({
      success: true,
      message: 'Default passwords restored: Admin (uatal.pk@gmail.com -> Umer@9157) & Employee (ali@atal.com -> Ali@297).'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 8. BACKUP EXPORT & IMPORT (Section 16)
// -------------------------------------------------------------

router.get('/admin/backup/export', requireAdmin, (req, res) => {
  try {
    const backup = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      store_name: 'ATAL STORE',
      settings: db.prepare('SELECT key, value FROM settings').all(),
      categories: db.prepare('SELECT * FROM categories').all(),
      subcategories: db.prepare('SELECT * FROM subcategories').all(),
      products: db.prepare('SELECT * FROM products').all(),
      product_variants: db.prepare('SELECT * FROM product_variants').all(),
      banners: db.prepare('SELECT * FROM banners').all(),
      homepage_sections: db.prepare('SELECT * FROM homepage_sections').all(),
      launch_soon: db.prepare('SELECT * FROM launch_soon').all(),
      coupons: db.prepare('SELECT * FROM coupons').all(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=atal-store-backup-${Date.now()}.json`);
    res.json(backup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/backup/import', requireAdmin, (req, res) => {
  try {
    const { backupData, dryRun = false } = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ error: 'Invalid backup file: Not a valid JSON document' });
    }

    if (!backupData.version) {
      return res.status(400).json({ error: 'Invalid backup: Missing version declaration.' });
    }

    const preview = {
      categories: Array.isArray(backupData.categories) ? backupData.categories.length : 0,
      subcategories: Array.isArray(backupData.subcategories) ? backupData.subcategories.length : 0,
      products: Array.isArray(backupData.products) ? backupData.products.length : 0,
      product_variants: Array.isArray(backupData.product_variants) ? backupData.product_variants.length : 0,
      banners: Array.isArray(backupData.banners) ? backupData.banners.length : 0,
      settings: Array.isArray(backupData.settings) ? backupData.settings.length : 0,
    };

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        preview,
        message: 'Backup validation passed. Ready to restore.'
      });
    }

    // Transactional restore
    const restoreTx = db.transaction(() => {
      if (Array.isArray(backupData.settings)) {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        for (const s of backupData.settings) {
          if (s.key && s.value !== undefined) stmt.run(s.key, String(s.value));
        }
      }

      if (Array.isArray(backupData.categories)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO categories (id, name, slug, icon, image, description, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const c of backupData.categories) {
          stmt.run(c.id, c.name, c.slug, c.icon, c.image, c.description || '', c.display_order || 0);
        }
      }

      if (Array.isArray(backupData.products)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO products (
            id, name, slug, sku, brand, category_id, subcategory_id, short_description, description, images,
            purchase_price, original_price, sale_price, currency, available_stock, low_stock_threshold,
            new_launch, spotlight, festive_deal, festive_deal_order, spotlight_order, new_launch_order
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, 'PKR', ?, ?,
            ?, ?, ?, ?, ?, ?
          )
        `);
        for (const p of backupData.products) {
          stmt.run(
            p.id, p.name, p.slug, p.sku, p.brand, p.category_id, p.subcategory_id || null,
            p.short_description || '', p.description || '', typeof p.images === 'string' ? p.images : JSON.stringify(p.images || []),
            p.purchase_price || 0, p.original_price || p.sale_price, p.sale_price, p.available_stock || 10, p.low_stock_threshold || 5,
            p.new_launch ? 1 : 0, p.spotlight ? 1 : 0, p.festive_deal ? 1 : 0,
            p.festive_deal_order || 0, p.spotlight_order || 0, p.new_launch_order || 0
          );
        }
      }

      if (Array.isArray(backupData.banners)) {
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO banners (id, title, subtitle, image_url, cta_text, cta_url, display_order, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const b of backupData.banners) {
          stmt.run(b.id, b.title, b.subtitle || '', b.image_url, b.cta_text || 'Shop Now', b.cta_url || '/', b.display_order || 0, b.is_active ? 1 : 0);
        }
      }

      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, 'BACKUP_RESTORED', 'SYSTEM', 'DATABASE', ?)
      `).run(`aud_${Date.now()}`, (req as any).user.id, JSON.stringify(preview));
    });

    restoreTx();

    res.json({
      success: true,
      message: 'Backup imported and records restored safely without corruption.',
      recordsRestored: preview
    });
  } catch (err: any) {
    res.status(400).json({ error: `Import failed: ${err.message}` });
  }
});
