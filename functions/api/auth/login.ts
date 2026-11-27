// Cloudflare Pages Function for /api/auth/login
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

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const onRequestOptions = async ({ request }: { request: Request }) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
};

export const onRequestPost = async (context: { request: Request; env?: any }) => {
  const { request, env } = context;
  try {
    const body: any = await request.json().catch(() => ({}));
    const { email, password } = body || {};

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password required' }, 400, request);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const rawPass = String(password).trim();
    const passHash = await computeHmacSha256(rawPass);

    // 1. If Supabase is configured, verify strictly against stored password_hash
    if (isSupabaseConfigured(env)) {
      const client = getSupabaseClient(env);
      if (client) {
        const { data: dbUser, error } = await client
          .from('customers')
          .select('id, email, password_hash, full_name, phone, role')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (dbUser && !error) {
          if (constantTimeEqual(String(dbUser.password_hash || '').toLowerCase(), passHash.toLowerCase())) {
            const user = {
              id: dbUser.id,
              email: dbUser.email,
              full_name: dbUser.full_name,
              phone: dbUser.phone || '03719150297',
              role: dbUser.role || 'customer',
            };
            const token = await signAuthTokenAsync(user.id, user.role, env);
            return jsonResponse({ user, token }, 200, request);
          }
          return jsonResponse({ error: 'Invalid email or password' }, 401, request);
        }
      }
    }

    // 2. Bootstrap default Staff / Admin account ONLY when not found in customers table
    if (cleanEmail === 'uatal.pk@gmail.com' && rawPass === 'Umer@9157') {
      const user = {
        id: 'usr_admin_uatal',
        email: 'uatal.pk@gmail.com',
        full_name: 'Umer (Administrator)',
        phone: '03719150297',
        role: 'admin',
      };
      if (isSupabaseConfigured(env)) {
        const client = getSupabaseClient(env);
        if (client) {
          await client.from('customers').upsert({
            id: user.id,
            email: user.email,
            password_hash: passHash,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role,
          }, { onConflict: 'email' });
        }
      }
      const token = await signAuthTokenAsync(user.id, user.role, env);
      return jsonResponse({ user, token }, 200, request);
    }

    if (cleanEmail === 'ali@atal.com' && rawPass === 'Ali@297') {
      const user = {
        id: 'usr_emp_ali',
        email: 'ali@atal.com',
        full_name: 'Ali (Store Manager)',
        phone: '03719150297',
        role: 'employee',
      };
      if (isSupabaseConfigured(env)) {
        const client = getSupabaseClient(env);
        if (client) {
          await client.from('customers').upsert({
            id: user.id,
            email: user.email,
            password_hash: passHash,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role,
          }, { onConflict: 'email' });
        }
      }
      const token = await signAuthTokenAsync(user.id, user.role, env);
      return jsonResponse({ user, token }, 200, request);
    }

    return jsonResponse({ error: 'Invalid email or password' }, 401, request);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Authentication error' }, 500, request);
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
