// Cloudflare Pages Function for /api/auth/register
import { getSupabaseClient, isSupabaseConfigured } from '../../../src/server/supabaseStore.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

async function computeHmacSha256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode('atal_salt_2026_pk');
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(password));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost = async (context: { request: Request; env?: any }) => {
  const { request, env } = context;
  try {
    const body: any = await request.json().catch(() => ({}));
    const { full_name, email, password, confirm_password, phone } = body || {};

    if (!email || !password || !full_name || !phone) {
      return jsonResponse({ error: 'Full name, email, WhatsApp number, password, and confirmation are required' }, 400);
    }

    if (password !== confirm_password) {
      return jsonResponse({ error: 'Password and Confirm Password do not match' }, 400);
    }

    const cleanPhone = String(phone).replace(/[\s-]/g, '');
    const pkPhoneRegex = /^(\+92|0092|92|0)?3[0-9]{9}$/;
    if (!pkPhoneRegex.test(cleanPhone)) {
      return jsonResponse({ error: 'Please enter a valid Pakistani WhatsApp mobile number (e.g. 03001234567)' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const passHash = await computeHmacSha256(String(password).trim());

    if (isSupabaseConfigured(env)) {
      const client = getSupabaseClient(env);
      if (client) {
        // Check if existing
        const { data: existing } = await client.from('customers').select('id').eq('email', cleanEmail).maybeSingle();
        if (existing) {
          return jsonResponse({ error: 'An account with this email address already exists' }, 400);
        }

        const { error: insErr } = await client.from('customers').insert({
          id,
          email: cleanEmail,
          password_hash: passHash,
          full_name: String(full_name).trim(),
          phone: cleanPhone,
          role: 'customer',
        });

        if (insErr) {
          return jsonResponse({ error: insErr.message || 'Failed to register customer account' }, 500);
        }
      }
    }

    const user = {
      id,
      email: cleanEmail,
      full_name: String(full_name).trim(),
      phone: cleanPhone,
      role: 'customer',
    };
    const token = btoa(`${id}:customer:${Date.now()}`);

    return jsonResponse({ user, token }, 200);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Registration error' }, 500);
  }
};

export const onRequest = async (context: { request: Request; env?: any }) => {
  const { request } = context;
  if (request.method === 'OPTIONS') return onRequestOptions();
  if (request.method === 'POST') return onRequestPost(context);

  return jsonResponse({ error: 'Method Not Allowed' }, 405, { Allow: 'POST, OPTIONS' });
};
