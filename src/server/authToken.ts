// Pure Web Crypto HMAC-SHA256 Session Token Utility (Node 20+ & Cloudflare Workers Compatible)

export const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface VerifiedTokenPayload {
  userId: string;
  role: string;
  issuedAt: number;
}

function readEnvSecret(envObj?: any): string | undefined {
  if (envObj && typeof envObj.AUTH_SECRET === 'string' && envObj.AUTH_SECRET.trim()) {
    return envObj.AUTH_SECRET.trim();
  }
  if (typeof process !== 'undefined' && process.env && typeof process.env.AUTH_SECRET === 'string' && process.env.AUTH_SECRET.trim()) {
    return process.env.AUTH_SECRET.trim();
  }
  return undefined;
}

export function getRuntimeAuthSecret(envObj?: any): string {
  const configured = readEnvSecret(envObj);
  if (configured) return configured;

  const g = globalThis as any;
  if (!g.__ATAL_RUNTIME_AUTH_SECRET__) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    g.__ATAL_RUNTIME_AUTH_SECRET__ = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return g.__ATAL_RUNTIME_AUTH_SECRET__;
}

export function extractBearerToken(authHeader?: string | null): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const trimmed = authHeader.replace(/^Bearer\s+/i, '').trim();
  return trimmed || null;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmacHex(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signAuthTokenAsync(
  userId: string,
  role: string,
  envObj?: any
): Promise<string> {
  const cleanUserId = String(userId).replace(/:/g, '_');
  const cleanRole = String(role || 'customer').replace(/:/g, '_');
  const issuedAt = Date.now();
  const payload = `${cleanUserId}:${cleanRole}:${issuedAt}`;
  const sigHex = await computeHmacHex(payload, getRuntimeAuthSecret(envObj));
  return btoa(`${payload}:${sigHex}`);
}

export async function verifyAuthTokenAsync(
  token: string,
  envObj?: any
): Promise<VerifiedTokenPayload | null> {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = atob(token.trim());
    const parts = decoded.split(':');
    if (parts.length !== 4) return null;

    const [userId, role, tsStr, sigHex] = parts;
    if (!userId || !role || !tsStr || !sigHex || !/^[0-9a-f]{64}$/i.test(sigHex)) {
      return null;
    }

    const issuedAt = Number(tsStr);
    const now = Date.now();
    if (!Number.isFinite(issuedAt) || issuedAt > now + MAX_CLOCK_SKEW_MS || now - issuedAt > TOKEN_MAX_AGE_MS) {
      return null;
    }

    const expectedHex = await computeHmacHex(`${userId}:${role}:${tsStr}`, getRuntimeAuthSecret(envObj));
    if (!constantTimeEqualHex(sigHex.toLowerCase(), expectedHex.toLowerCase())) {
      return null;
    }

    return { userId, role, issuedAt };
  } catch {
    return null;
  }
}

export async function verifyAdminRequestAsync(
  request: Request,
  envObj?: any
): Promise<VerifiedTokenPayload | null> {
  const token = extractBearerToken(request.headers.get('Authorization') || request.headers.get('authorization'));
  if (!token) return null;

  const verified = await verifyAuthTokenAsync(token, envObj);
  if (!verified) return null;
  if (verified.role !== 'admin' && verified.role !== 'employee') return null;
  return verified;
}
