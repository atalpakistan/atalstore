// Cloudflare Pages Function for /api/auth/me
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export const onRequestGet = async ({ request }: { request: Request }) => {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  try {
    const decoded = atob(token);
    const [userId, role] = decoded.split(':');

    if (userId === 'usr_admin_uatal' || role === 'admin') {
      return jsonResponse({
        user: {
          id: 'usr_admin_uatal',
          email: 'uatal.pk@gmail.com',
          full_name: 'Umer (Administrator)',
          phone: '03719150297',
          role: 'admin',
        },
      });
    }

    if (userId === 'usr_emp_ali' || role === 'employee') {
      return jsonResponse({
        user: {
          id: 'usr_emp_ali',
          email: 'ali@atal.com',
          full_name: 'Ali (Store Manager)',
          phone: '03719150297',
          role: 'employee',
        },
      });
    }

    if (userId) {
      return jsonResponse({
        user: {
          id: userId,
          email: 'customer@atal.com',
          full_name: 'Customer',
          phone: '03001234567',
          role: role || 'customer',
        },
      });
    }

    return jsonResponse({ error: 'Not authenticated' }, 401);
  } catch {
    return jsonResponse({ error: 'Invalid token' }, 401);
  }
};

export const onRequest = async ({ request }: { request: Request }) => {
  if (request.method === 'OPTIONS') return onRequestOptions();
  if (request.method === 'GET') return onRequestGet({ request });

  return jsonResponse({ error: 'Method Not Allowed' }, 405, { Allow: 'GET, OPTIONS' });
};
