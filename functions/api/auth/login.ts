// Cloudflare Pages Function for /api/auth/login
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

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost = async ({ request }: { request: Request }) => {
  try {
    const body: any = await request.json().catch(() => ({}));
    const { email, password } = body || {};

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password required' }, 400);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const rawPass = String(password).trim();

    // Initialize global staff password store if missing
    if (!(globalThis as any).__ATAL_STAFF_PASSWORDS__) {
      (globalThis as any).__ATAL_STAFF_PASSWORDS__ = {
        'uatal.pk@gmail.com': 'Umer@9157',
        'ali@atal.com': 'Ali@297'
      };
    }
    const staffPasses = (globalThis as any).__ATAL_STAFF_PASSWORDS__;

    // Staff & Administrator Auth Checks
    if (cleanEmail === 'uatal.pk@gmail.com' && rawPass === (staffPasses['uatal.pk@gmail.com'] || 'Umer@9157')) {
      const user = {
        id: 'usr_admin_uatal',
        email: 'uatal.pk@gmail.com',
        full_name: 'Umer (Administrator)',
        phone: '03719150297',
        role: 'admin',
      };
      const token = btoa(`${user.id}:${user.role}:${Date.now()}`);
      return jsonResponse({ user, token }, 200);
    }

    if (cleanEmail === 'ali@atal.com' && rawPass === (staffPasses['ali@atal.com'] || 'Ali@297')) {
      const user = {
        id: 'usr_emp_ali',
        email: 'ali@atal.com',
        full_name: 'Ali (Store Manager)',
        phone: '03719150297',
        role: 'employee',
      };
      const token = btoa(`${user.id}:${user.role}:${Date.now()}`);
      return jsonResponse({ user, token }, 200);
    }

    // Default Customer check fallback
    if (cleanEmail.includes('@') && rawPass.length >= 4) {
      const id = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const user = {
        id,
        email: cleanEmail,
        full_name: cleanEmail.split('@')[0],
        phone: '03001234567',
        role: 'customer',
      };
      const token = btoa(`${user.id}:${user.role}:${Date.now()}`);
      return jsonResponse({ user, token }, 200);
    }

    return jsonResponse({ error: 'Invalid email or password' }, 401);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || 'Authentication error' }, 500);
  }
};

export const onRequest = async ({ request }: { request: Request }) => {
  if (request.method === 'OPTIONS') return onRequestOptions();
  if (request.method === 'POST') return onRequestPost({ request });

  return jsonResponse({ error: 'Method Not Allowed' }, 405, { Allow: 'POST, OPTIONS' });
};
