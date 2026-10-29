export interface FetchDiagnostic {
  fullUrl: string;
  method: string;
  status: number;
  contentType: string | null;
  serverHeader: string | null;
  cfRay: string | null;
  isCloudflareServed: boolean;
  isHtmlFallback: boolean;
  responseSnippet: string;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string; diagnostic?: FetchDiagnostic }> {
  const inputStr = typeof input === 'string' ? input : input.toString();
  const fullUrl = typeof window !== 'undefined'
    ? new URL(inputStr, window.location.href).href
    : inputStr;
  const method = (init?.method || 'GET').toUpperCase();
  const isAuthCall = inputStr.includes('/login') || inputStr.includes('/auth');

  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type');
    const serverHeader = res.headers.get('server');
    const cfRay = res.headers.get('cf-ray');
    const isCloudflareServed = Boolean(cfRay || serverHeader?.toLowerCase().includes('cloudflare'));

    const text = await res.text();
    const isHtmlFallback = Boolean(text && (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')));
    const responseSnippet = text ? text.trim().slice(0, 300) : '[Empty Response Body]';

    const diagnostic: FetchDiagnostic = {
      fullUrl,
      method,
      status: res.status,
      contentType,
      serverHeader,
      cfRay,
      isCloudflareServed,
      isHtmlFallback,
      responseSnippet,
    };

    if (isAuthCall) {
      console.group(`🔐 [Auth Diagnostic Log] ${method} ${fullUrl}`);
      console.log('📍 Request Method:', method);
      console.log('🔗 Full Request URL:', fullUrl);
      console.log('📊 Response Status:', res.status, res.statusText);
      console.log('📄 Content-Type:', contentType || 'None');
      console.log('☁️ Cloudflare Routing Headers:', {
        server: serverHeader || 'N/A',
        'cf-ray': cfRay || 'N/A (Local / Direct server)',
        isCloudflareIntercepted: isCloudflareServed,
      });
      console.log('🚩 HTML Fallback Intercepted:', isHtmlFallback ? 'YES (Static Routing Intercept Error)' : 'NO (Valid API Endpoint Response)');
      console.log('📝 Response Body Snippet:', responseSnippet);
      console.groupEnd();
    }

    if (!text || !text.trim()) {
      return {
        ok: res.ok,
        status: res.status,
        data: null,
        error: res.ok ? undefined : `Server returned empty response (${res.status})`,
        diagnostic,
      };
    }

    if (isHtmlFallback) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Routing error: Request was intercepted by static HTML fallback instead of API function (${res.status})`,
        diagnostic,
      };
    }

    try {
      const data = JSON.parse(text) as T;
      if (!res.ok && data && typeof data === 'object' && (data as any).error) {
        return { ok: false, status: res.status, data, error: (data as any).error, diagnostic };
      }
      return {
        ok: res.ok,
        status: res.status,
        data,
        error: res.ok ? undefined : ((data as any)?.error || `Request failed with status ${res.status}`),
        diagnostic,
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Server error (${res.status}): Non-JSON response`,
        diagnostic,
      };
    }
  } catch (err: any) {
    const diagnostic: FetchDiagnostic = {
      fullUrl,
      method,
      status: 0,
      contentType: null,
      serverHeader: null,
      cfRay: null,
      isCloudflareServed: false,
      isHtmlFallback: false,
      responseSnippet: err?.message || 'Network error',
    };

    if (isAuthCall) {
      console.group(`🔐 [Auth Diagnostic Log - Exception] ${method} ${fullUrl}`);
      console.error('Network or fetch error:', err);
      console.groupEnd();
    }

    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Network error',
      diagnostic,
    };
  }
}

