export interface ProductVariant {
  id: string;
  product_id: string;
  color_name?: string;
  color_code?: string;
  size?: string;
  sku: string;
  price: number;
  stock: number;
  image_url?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category_id: string;
  subcategory_id?: string;
  category_name?: string;
  subcategory_name?: string;
  short_description: string;
  description: string;
  images: string[];
  purchase_price: number;
  original_price: number;
  sale_price: number;
  currency: string;
  available_stock: number;
  low_stock_threshold: number;
  weight?: number;
  dimensions?: string;
  shipping_requirements?: string;
  seo_title?: string;
  seo_description?: string;
  new_launch: number; // 0 or 1
  spotlight: number; // 0 or 1
  festive_deal: number; // 0 or 1
  festive_deal_order?: number;
  spotlight_order?: number;
  new_launch_order?: number;
  rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image: string;
  description?: string;
  display_order: number;
  created_at: string;
  subcategories?: Subcategory[];
  product_count?: number;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  cta_text: string;
  cta_url: string;
  display_order: number;
  is_active: number;
  start_date?: string;
  end_date?: string;
}

export interface LaunchSoonProduct {
  id: string;
  product_name: string;
  slug: string;
  short_description: string;
  image_url: string;
  expected_launch_date: string;
  countdown_target?: string;
  coming_soon_badge: string;
  display_order: number;
  is_active: number;
  created_at: string;
}

export interface HomepageSection {
  section_key: string;
  title: string;
  subtitle?: string;
  is_enabled: number;
  display_order: number;
  layout?: string;
  max_items: number;
  custom_settings?: string;
}

export interface StoreSettings {
  store_name: string;
  tagline: string;
  announcement_bar_text: string;
  announcement_bar_enabled: boolean;
  header_logo_url: string;
  header_logo_height: number;
  footer_logo_url: string;
  footer_description: string;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  support_hours: string;
  social_facebook: string;
  social_instagram: string;
  social_tiktok: string;
  social_youtube: string;
  policy_shipping: string;
  policy_return: string;
  policy_privacy: string;
  policy_terms: string;
  faq_content: string;
  free_shipping_threshold: number;
  default_shipping_fee: number;
  min_order_amount: number;
  cod_enabled: boolean;
  jazzcash_enabled: boolean;
  jazzcash_merchant_id: string;
  jazzcash_password?: string;
  jazzcash_integrity_salt?: string;
  jazzcash_sandbox: boolean;
  easypaisa_enabled: boolean;
  easypaisa_store_id: string;
  easypaisa_hash_key?: string;
  easypaisa_sandbox: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'customer' | 'admin' | 'employee';
  created_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product: Product;
  variant_id?: string;
  variant?: ProductVariant;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_title?: string;
  sku?: string;
  price: number;
  quantity: number;
  image_url: string;
  total: number;
}

export interface Order {
  id: string; // e.g. ATAL-PK-10294
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  phone: string;
  province: string;
  city: string;
  area: string;
  street_address: string;
  landmark?: string;
  order_notes?: string;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total_amount: number;
  payment_method: 'cod' | 'jazzcash' | 'easypaisa' | 'hbl' | string;
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  order_status: 'Pending' | 'Confirmed' | 'Processing' | 'Ready to Ship' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned' | 'Refunded';
  tracking_number?: string;
  tracking_courier?: string;
  transaction_ref?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount?: number;
  usage_limit?: number;
  usage_count: number;
  is_active: number;
  expires_at?: string;
}

export interface HomepagePayload {
  settings: StoreSettings;
  sections: HomepageSection[];
  banners: Banner[];
  categories: Category[];
  festive_deals: Product[];
  spotlight_products: Product[];
  new_launches: Product[];
  launch_soon: LaunchSoonProduct[];
  catalog_sample: Product[];
}
