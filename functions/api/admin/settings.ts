// Cloudflare Pages Function for /api/admin/settings
import type { StoreSettings } from '../../../src/types';
import { isSupabaseConfigured, fetchSettingsFromSupabase, updateSettingsInSupabase } from '../../../src/server/supabaseStore.js';
import { verifyAdminRequestAsync } from '../../../src/server/authToken.js';

function getCorsHeaders(request?: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
  if (request) {
    const origin = request.headers.get('Origin');
    const urlOrigin = new URL(request.url).origin;
    if (origin && origin === urlOrigin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Vary'] = 'Origin';
    }
  }
  return headers;
}

const DEFAULT_SETTINGS: Record<string, any> = {
  store_name: 'ATAL STORE',
  tagline: 'Smart Shop. Live Better',
  announcement_bar_text: '🇵🇰 Free Nationwide Delivery on orders above Rs. 9,999 | Rs. 290 Delivery Fee | 100% Genuine Guaranteed',
  announcement_bar_enabled: true,
  header_logo_url: '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg',
  header_logo_height: 42,
  footer_logo_url: '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg',
  footer_description: 'ATAL – Shop Smart. Live Better. 🛍️\nYour trusted online store for beauty, cosmetics, perfumes, fashion & electronics—quality products, stylish choices, and easy shopping, all in one place. ✨',
  support_phone: '03719150297',
  support_whatsapp: '03719150297',
  support_email: 'contact.to.atal@gmail.com',
  support_hours: 'Monday – Saturday: 9:00 AM – 9:00 PM PKT',
  social_facebook: 'https://www.facebook.com/share/1DgG52novy/',
  social_instagram: 'https://www.instagram.com/atal.pakistan?stkn=dXM2NTl0bHBzZ21n',
  social_tiktok: 'https://www.tiktok.com/@atal.pakistan',
  social_youtube: '',
  policy_shipping: '',
  policy_return: '',
  policy_privacy: '',
  policy_terms: '',
  faq_content: '',
  free_shipping_threshold: 9999,
  default_shipping_fee: 290,
  delivery_advance_mandatory: true,
  min_order_amount: 500,
  cod_enabled: true,
  jazzcash_enabled: true,
  jazzcash_merchant_id: '03227796097',
  jazzcash_account_title: 'Omar Farooq',
  jazzcash_till_id: '',
  jazzcash_account_number: '03227796097',
  jazzcash_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.26.22_PM_96ced8c4.jpeg',
  jazzcash_sandbox: false,
  easypaisa_enabled: true,
  easypaisa_store_id: '03227796097',
  easypaisa_account_title: 'Omar Farooq',
  easypaisa_till_id: '',
  easypaisa_account_number: '03227796097',
  easypaisa_qr_url: '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.24.41_PM_3cd4a1f7.jpeg',
  easypaisa_sandbox: false,
};

function getStoredSettings(): Record<string, any> {
  if (!(globalThis as any).__ATAL_SETTINGS__) {
    (globalThis as any).__ATAL_SETTINGS__ = { ...DEFAULT_SETTINGS };
  }
  return (globalThis as any).__ATAL_SETTINGS__;
}

function syncGlobalDataSettings(updatedSettings: Record<string, any>) {
  if ((globalThis as any).__ATAL_DATA__) {
    (globalThis as any).__ATAL_DATA__.settings = { ...updatedSettings };
  }
}

function jsonResponse(data: any, status = 200, request?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(request),
    },
  });
}

const NUMERIC_KEYS = new Set([
  'free_shipping_threshold',
  'default_shipping_fee',
  'min_order_amount',
  'header_logo_height'
]);

const BOOLEAN_KEYS = new Set([
  'announcement_bar_enabled',
  'delivery_advance_mandatory',
  'cod_enabled',
  'jazzcash_enabled',
  'jazzcash_sandbox',
  'easypaisa_enabled',
  'easypaisa_sandbox'
]);

function sanitizeAndValidateSettings(input: Record<string, any>): Partial<StoreSettings> & Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof key !== 'string' || key.trim().length === 0) continue;

    if (BOOLEAN_KEYS.has(key)) {
      if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === 'true' || value === 1 || value === '1') {
        sanitized[key] = true;
      } else if (value === 'false' || value === 0 || value === '0') {
        sanitized[key] = false;
      } else {
        sanitized[key] = Boolean(value);
      }
    } else if (NUMERIC_KEYS.has(key)) {
      const num = Number(value);
      sanitized[key] = !isNaN(num) ? num : 0;
    } else {
      sanitized[key] = String(value ?? '');
    }
  }

  return sanitized;
}

export const onRequestOptions = async ({ request }: { request: Request }) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
};

export const onRequestGet = async (context: { request: Request; env?: any }) => {
  const { request, env } = context;
  const staffUser = await verifyAdminRequestAsync(request, env);
  if (!staffUser) {
    return jsonResponse({ error: 'Unauthorized: Staff or Administrator access required' }, 403, request);
  }
  if (isSupabaseConfigured(env)) {
    const sbSettings = await fetchSettingsFromSupabase(env);
    if (sbSettings) return jsonResponse(sbSettings, 200, request);
  }
  const settings = getStoredSettings();
  return jsonResponse(settings, 200, request);
};

export const onRequestPut = async (context: { request: Request; env?: any }) => {
  const { request, env } = context;
  const staffUser = await verifyAdminRequestAsync(request, env);
  if (!staffUser) {
    return jsonResponse({ error: 'Unauthorized: Staff or Administrator access required' }, 403, request);
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'Invalid JSON payload: Object required' }, 400, request);
    }

    const sanitizedUpdates = sanitizeAndValidateSettings(body);
    if (!isSupabaseConfigured(env)) {
      return jsonResponse({
        error: 'Persistent database is not connected. In your Cloudflare Pages Dashboard, go to Settings -> Environment Variables, and add SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).'
      }, 503, request);
    }

    const sbRes = await updateSettingsInSupabase(sanitizedUpdates, env);
    if (!sbRes.success) {
      return jsonResponse({ error: sbRes.error || 'Failed to update settings in database' }, 500, request);
    }

    const current = getStoredSettings();
    for (const [key, value] of Object.entries(sanitizedUpdates)) {
      current[key] = value;
    }
    syncGlobalDataSettings(current);

    return jsonResponse({
      success: true,
      message: 'Settings saved permanently in Supabase database.',
      settings: current
    }, 200, request);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Failed to update settings' }, 500, request);
  }
};

export const onRequest = async (context: { request: Request; env?: any }) => {
  const { request } = context;
  if (request.method === 'OPTIONS') return onRequestOptions({ request });
  if (request.method === 'GET') return onRequestGet(context);
  if (request.method === 'PUT') return onRequestPut(context);

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Allow: 'GET, PUT, OPTIONS',
      ...getCorsHeaders(request),
    },
  });
};
