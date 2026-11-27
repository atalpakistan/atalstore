// Cloudflare Pages Function for /api/auth/me
import { getSupabaseClient, isSupabaseConfigured } from '../../../src/server/supabaseStore.js';
import { extractBearerToken, verifyAuthTokenAsync } from '../../../src/server/authToken.js';

function getCorsHeaders(request?: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export const onRequestOptions = async ({ request }: { request: Request }) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
};

export const onRequestGet = async ({ request, env }: { request: Request; env?: any }) => {
  const token = extractBearerToken(request.headers.get('Authorization') || request.headers.get('authorization'));
  if (!token) {
    return jsonResponse({ error: 'Not authenticated' }, 401, request);
  }

  const verified = await verifyAuthTokenAsync(token, env);
  if (!verified) {
    return jsonResponse({ error: 'Invalid or expired token' }, 401, request);
  }

  if (isSupabaseConfigured(env)) {
    const client = getSupabaseClient(env);
    if (client) {
      const { data: dbUser } = await client
        .from('customers')
        .select('id, email, full_name, phone, role')
        .eq('id', verified.userId)
        .maybeSingle();

      if (dbUser) {
        return jsonResponse({ user: dbUser }, 200, request);
      }
    }
  }

  if (verified.userId === 'usr_admin_uatal') {
    return jsonResponse({
      user: {
        id: 'usr_admin_uatal',
        email: 'uatal.pk@gmail.com',
        full_name: 'Umer (Administrator)',
        phone: '03719150297',
        role: 'admin',
      },
    }, 200, request);
  }

  if (verified.userId === 'usr_emp_ali') {
    return jsonResponse({
      user: {
        id: 'usr_emp_ali',
        email: 'ali@atal.com',
        full_name: 'Ali (Store Manager)',
        phone: '03719150297',
        role: 'employee',
      },
    }, 200, request);
  }

  return jsonResponse({ error: 'Account not found' }, 401, request);
};

export const onRequest = async (context: { request: Request; env?: any }) => {
  const { request } = context;
  if (request.method === 'OPTIONS') return onRequestOptions({ request });
  if (request.method === 'GET') return onRequestGet(context);

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Allow: 'GET, OPTIONS',
      ...getCorsHeaders(request),
    },
  });
};
