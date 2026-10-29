// Cloudflare Pages Function for /api/auth/register
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

export const onRequest = async ({ request }: { request: Request }) => {
  if (request.method === 'OPTIONS') return onRequestOptions();
  if (request.method === 'POST') return onRequestPost({ request });

  return jsonResponse({ error: 'Method Not Allowed' }, 405, { Allow: 'POST, OPTIONS' });
};
