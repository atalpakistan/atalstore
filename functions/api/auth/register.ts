// Cloudflare Pages Function for /api/auth/register
import { getSupabaseClient, isSupabaseConfigured } from '../../../src/server/supabaseStore.js';
import { signAuthTokenAsync } from '../../../src/server/authToken.js';

function getCorsHeaders(request?: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function jsonResponse(data: any, status = 200, request?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(request),
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

export const onRequestOptions = async ({ request }: { request: Request }) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
};

export const onRequestPost = async (context: { request: Request; env?: any }) => {
  const { request, env } = context;
  try {
    const body: any = await request.json().catch(() => ({}));
    const { full_name, email, password, confirm_password, phone } = body || {};

    if (!email || !password || !full_name || !phone) {
      return jsonResponse({ error: 'Full name, email, WhatsApp number, password, and confirmation are required' }, 400, request);
    }

    if (String(password).trim().length < 4) {
      return jsonResponse({ error: 'Password must be at least 4 characters long' }, 400, request);
    }

    if (password !== confirm_password) {
      return jsonResponse({ error: 'Password and Confirm Password do not match' }, 400, request);
    }

    const cleanPhone = String(phone).replace(/[\s-]/g, '');
    const pkPhoneRegex = /^(\+92|0092|92|0)?3[0-9]{9}$/;
    if (!pkPhoneRegex.test(cleanPhone)) {
      return jsonResponse({ error: 'Please enter a valid Pakistani WhatsApp mobile number (e.g. 03001234567)' }, 400, request);
    }

    if (!isSupabaseConfigured(env)) {
      return jsonResponse({ error: 'Persistent database is required to register customer accounts.' }, 503, request);
    }

    const client = getSupabaseClient(env);
    if (!client) {
      return jsonResponse({ error: 'Failed to connect to customer database.' }, 503, request);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const passHash = await computeHmacSha256(String(password).trim());

    const { data: existing } = await client.from('customers').select('id').eq('email', cleanEmail).maybeSingle();
    if (existing) {
      return jsonResponse({ error: 'An account with this email address already exists' }, 400, request);
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
      return jsonResponse({ error: insErr.message || 'Failed to register customer account' }, 500, request);
    }

    const user = {
      id,
      email: cleanEmail,
      full_name: String(full_name).trim(),
      phone: cleanPhone,
      role: 'customer',
    };
    const token = await signAuthTokenAsync(id, 'customer', env);

    return jsonResponse({ user, token }, 200, request);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Registration error' }, 500, request);
  }
};

export const onRequest = async (context: { request: Request; env?: any }) => {
  const { request } = context;
  if (request.method === 'OPTIONS') return onRequestOptions({ request });
  if (request.method === 'POST') return onRequestPost(context);

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Allow: 'POST, OPTIONS',
      ...getCorsHeaders(request),
    },
  });
};
