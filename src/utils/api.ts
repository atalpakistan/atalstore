export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(input, init);
    const text = await res.text();
    if (!text || !text.trim()) {
      return {
        ok: res.ok,
        status: res.status,
        data: null,
        error: res.ok ? undefined : `Server returned empty response (${res.status})`,
      };
    }
    try {
      const data = JSON.parse(text) as T;
      if (!res.ok && data && typeof data === 'object' && (data as any).error) {
        return { ok: false, status: res.status, data, error: (data as any).error };
      }
      return {
        ok: res.ok,
        status: res.status,
        data,
        error: res.ok ? undefined : ((data as any)?.error || `Request failed with status ${res.status}`),
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Server error (${res.status}): Non-JSON response`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Network error',
    };
  }
}
