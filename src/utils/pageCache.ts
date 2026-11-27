import { HomepagePayload, Product, StoreSettings } from '../types';
import { safeFetchJson } from './api';

export interface CatalogPayload {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductDetailPayload {
  product: Product;
  related: Product[];
  redirect_to?: string;
}

export interface ProductViewState {
  selectedVariantId?: string;
  selectedImageIndex: number;
  quantity: number;
}

export interface CatalogFilterState {
  searchTerm: string;
  selectedCategory: string;
  selectedSubcategory: string;
  priceSort: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  maxPriceFilter: number | '';
  page: number;
}

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const HOMEPAGE_FRESH_TTL = 90 * 1000; // 90s fresh
const HOMEPAGE_MAX_STALE = 10 * 60 * 1000; // 10m SWR window
const PRODUCT_FRESH_TTL = 60 * 1000; // 60s fresh (background refresh after 60s)
const PRODUCT_MAX_STALE = 10 * 60 * 1000; // 10m SWR window
const CATALOG_FRESH_TTL = 60 * 1000;
const CATALOG_MAX_STALE = 5 * 60 * 1000;
const SEARCH_FRESH_TTL = 60 * 1000;

const MAX_PRODUCT_ENTRIES = 80;
const MAX_CATALOG_ENTRIES = 40;
const MAX_SEARCH_ENTRIES = 30;
const MAX_SCROLL_ENTRIES = 100;
const MAX_PRELOADED_IMAGES = 160;

let homepageCache: CacheEntry<HomepagePayload> | null = null;
let settingsCache: CacheEntry<StoreSettings> | null = null;

const fullProductCache = new Map<string, CacheEntry<ProductDetailPayload>>();
const productIdToSlug = new Map<string, string>();
const productSummaryCache = new Map<string, CacheEntry<Product>>();
const catalogCache = new Map<string, CacheEntry<CatalogPayload>>();
const searchCache = new Map<string, CacheEntry<Product[]>>();

const productViewStates = new Map<string, ProductViewState>();
const scrollPositions = new Map<string, number>();
const inFlightRequests = new Map<string, Promise<any>>();
const preloadedImages = new Set<string>();

let savedCatalogFilterState: CatalogFilterState | null = null;

function enforceMapLimit<K, V>(map: Map<K, V>, maxEntries: number) {
  while (map.size > maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

export function createHistoryKey(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Image Preloading (deduplicated)
// ---------------------------------------------------------------------------
export function preloadImage(url?: string | null) {
  if (typeof window === 'undefined' || !url) return;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '/icon.svg' || trimmed.startsWith('data:') || preloadedImages.has(trimmed)) {
    return;
  }
  if (preloadedImages.size >= MAX_PRELOADED_IMAGES) {
    const first = preloadedImages.values().next().value;
    if (first) preloadedImages.delete(first);
  }
  preloadedImages.add(trimmed);
  const img = new Image();
  img.decoding = 'async';
  img.src = trimmed;
}

// ---------------------------------------------------------------------------
// Scroll Position & Route State Preservation
// ---------------------------------------------------------------------------
export function saveScrollPosition(historyKey: string, scrollY: number) {
  if (!historyKey) return;
  scrollPositions.delete(historyKey);
  scrollPositions.set(historyKey, Math.max(0, Math.round(scrollY)));
  enforceMapLimit(scrollPositions, MAX_SCROLL_ENTRIES);
}

export function getScrollPosition(historyKey: string): number {
  return scrollPositions.get(historyKey) ?? 0;
}

export function saveCatalogFilterState(state: CatalogFilterState) {
  savedCatalogFilterState = { ...state };
}

export function getCatalogFilterState(): CatalogFilterState | null {
  return savedCatalogFilterState ? { ...savedCatalogFilterState } : null;
}

export function saveProductViewState(slugOrId: string, state: ProductViewState, altId?: string) {
  const normalized = slugOrId.trim();
  if (!normalized) return;
  productViewStates.set(normalized, { ...state });
  if (altId && altId.trim()) {
    productViewStates.set(altId.trim(), { ...state });
  }
  enforceMapLimit(productViewStates, MAX_PRODUCT_ENTRIES * 2);
}

export function getProductViewState(slugOrId: string, altId?: string): ProductViewState | null {
  const key = slugOrId.trim();
  return productViewStates.get(key) || (altId ? productViewStates.get(altId.trim()) || null : null);
}

// ---------------------------------------------------------------------------
// Product Summary Seeding
// ---------------------------------------------------------------------------
export function seedProductsIntoCache(products: Product[] | undefined | null) {
  if (!Array.isArray(products) || products.length === 0) return;
  const now = Date.now();
  for (const p of products) {
    if (!p || !p.id) continue;
    if (p.slug) {
      productIdToSlug.set(p.id, p.slug);
      productSummaryCache.set(p.slug, { data: p, fetchedAt: now });
    }
    productSummaryCache.set(p.id, { data: p, fetchedAt: now });
  }
  enforceMapLimit(productSummaryCache, MAX_PRODUCT_ENTRIES * 2);
}

function cacheFullProduct(slugOrId: string, payload: ProductDetailPayload) {
  if (!payload?.product) return;
  const now = Date.now();
  const entry: CacheEntry<ProductDetailPayload> = { data: payload, fetchedAt: now };
  const slug = payload.product.slug || slugOrId;
  const id = payload.product.id;

  fullProductCache.delete(slug);
  fullProductCache.set(slug, entry);
  if (id) {
    productIdToSlug.set(id, slug);
    fullProductCache.delete(id);
    fullProductCache.set(id, entry);
  }
  if (slugOrId && slugOrId !== slug && slugOrId !== id) {
    fullProductCache.set(slugOrId, entry);
  }
  enforceMapLimit(fullProductCache, MAX_PRODUCT_ENTRIES * 2);
  seedProductsIntoCache([payload.product, ...(payload.related || [])]);
}

// ---------------------------------------------------------------------------
// Homepage Cache + Deduplicated Fetch
// ---------------------------------------------------------------------------
export function getCachedHomepage(): { data: HomepagePayload | null; isStale: boolean } {
  if (!homepageCache) return { data: null, isStale: true };
  const age = Date.now() - homepageCache.fetchedAt;
  if (age > HOMEPAGE_MAX_STALE) {
    return { data: null, isStale: true };
  }
  return {
    data: homepageCache.data,
    isStale: age > HOMEPAGE_FRESH_TTL,
  };
}

export async function fetchHomepageWithCache(forceFresh = false): Promise<HomepagePayload | null> {
  if (!forceFresh) {
    const cached = getCachedHomepage();
    if (cached.data && !cached.isStale) {
      return cached.data;
    }
  }

  const reqKey = forceFresh ? 'homepage:fresh' : 'homepage';
  const existing = inFlightRequests.get(reqKey);
  if (existing) return existing;

  const url = forceFresh ? '/api/homepage?fresh=1' : '/api/homepage';
  const promise = (async () => {
    try {
      const { ok, data } = await safeFetchJson<HomepagePayload>(
        url,
        forceFresh ? { cache: 'no-store' } : undefined
      );
      if (ok && data) {
        homepageCache = { data, fetchedAt: Date.now() };
        if (data.settings) {
          settingsCache = { data: data.settings, fetchedAt: Date.now() };
        }
        seedProductsIntoCache([
          ...(data.festive_deals || []),
          ...(data.spotlight_products || []),
          ...(data.new_launches || []),
          ...(data.catalog_sample || []),
        ]);
        return data;
      }
      return homepageCache?.data || null;
    } catch {
      return homepageCache?.data || null;
    } finally {
      inFlightRequests.delete(reqKey);
    }
  })();

  inFlightRequests.set(reqKey, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Settings Cache
// ---------------------------------------------------------------------------
export function getCachedSettings(): StoreSettings | null {
  return settingsCache?.data || homepageCache?.data?.settings || null;
}

export async function fetchSettingsWithCache(forceFresh = false): Promise<StoreSettings | null> {
  if (!forceFresh && settingsCache && Date.now() - settingsCache.fetchedAt < HOMEPAGE_FRESH_TTL) {
    return settingsCache.data;
  }
  const reqKey = forceFresh ? 'settings:fresh' : 'settings';
  const existing = inFlightRequests.get(reqKey);
  if (existing) return existing;

  const url = forceFresh ? '/api/settings?fresh=1' : '/api/settings';
  const promise = (async () => {
    try {
      const { ok, data } = await safeFetchJson<StoreSettings>(
        url,
        forceFresh ? { cache: 'no-store' } : undefined
      );
      if (ok && data) {
        settingsCache = { data, fetchedAt: Date.now() };
        return data;
      }
      return settingsCache?.data || null;
    } catch {
      return settingsCache?.data || null;
    } finally {
      inFlightRequests.delete(reqKey);
    }
  })();

  inFlightRequests.set(reqKey, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Product Detail Cache + Prefetch + Live Refresh
// ---------------------------------------------------------------------------
export function getCachedProduct(slugOrId: string): {
  full: ProductDetailPayload | null;
  summary: Product | null;
  isStale: boolean;
} {
  const key = slugOrId.trim();
  const resolvedSlug = productIdToSlug.get(key) || key;
  const fullEntry = fullProductCache.get(key) || fullProductCache.get(resolvedSlug);
  const now = Date.now();

  if (fullEntry && now - fullEntry.fetchedAt <= PRODUCT_MAX_STALE) {
    return {
      full: fullEntry.data,
      summary: fullEntry.data.product,
      isStale: now - fullEntry.fetchedAt > PRODUCT_FRESH_TTL,
    };
  }

  const summaryEntry = productSummaryCache.get(key) || productSummaryCache.get(resolvedSlug);
  if (summaryEntry && now - summaryEntry.fetchedAt <= PRODUCT_MAX_STALE) {
    return {
      full: null,
      summary: summaryEntry.data,
      isStale: true,
    };
  }

  return { full: null, summary: null, isStale: true };
}

export async function fetchProductWithCache(
  slugOrId: string,
  options?: { forceFresh?: boolean }
): Promise<{ ok: boolean; status: number; data: ProductDetailPayload | null; error?: string }> {
  const key = slugOrId.trim();
  const forceFresh = Boolean(options?.forceFresh);

  if (!forceFresh) {
    const cached = getCachedProduct(key);
    if (cached.full && !cached.isStale) {
      return { ok: true, status: 200, data: cached.full };
    }
  }

  const reqKey = `product:${forceFresh ? 'fresh:' : ''}${key}`;
  const existing = inFlightRequests.get(reqKey);
  if (existing) return existing;

  const url = `/api/products/${encodeURIComponent(key)}${forceFresh ? '?fresh=1' : ''}`;
  const promise = (async () => {
    try {
      const result = await safeFetchJson<ProductDetailPayload>(
        url,
        forceFresh ? { cache: 'no-store' } : undefined
      );
      if (result.ok && result.data && result.data.product && !result.data.redirect_to) {
        cacheFullProduct(key, result.data);
      }
      return {
        ok: result.ok,
        status: result.status,
        data: result.data,
        error: result.error,
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: err?.message || 'Failed to load product details',
      };
    } finally {
      inFlightRequests.delete(reqKey);
    }
  })();

  inFlightRequests.set(reqKey, promise);
  return promise;
}

export async function fetchFreshProduct(slugOrId: string): Promise<Product | null> {
  const res = await fetchProductWithCache(slugOrId, { forceFresh: true });
  return res.ok && res.data?.product ? res.data.product : null;
}

export function prefetchProduct(slugOrId?: string | null, imageUrl?: string | null) {
  if (imageUrl) preloadImage(imageUrl);
  if (!slugOrId) return;
  const cached = getCachedProduct(slugOrId);
  if (cached.full && !cached.isStale) return;
  // Low-priority background prefetch; ignore errors silently
  void fetchProductWithCache(slugOrId).catch(() => {});
}

// ---------------------------------------------------------------------------
// Catalog & Search Query Cache
// ---------------------------------------------------------------------------
export function getCachedCatalog(queryString: string): { data: CatalogPayload | null; isStale: boolean } {
  const entry = catalogCache.get(queryString);
  if (!entry) return { data: null, isStale: true };
  const age = Date.now() - entry.fetchedAt;
  if (age > CATALOG_MAX_STALE) return { data: null, isStale: true };
  return {
    data: entry.data,
    isStale: age > CATALOG_FRESH_TTL,
  };
}

export async function fetchCatalogWithCache(
  queryString: string,
  forceFresh = false
): Promise<CatalogPayload | null> {
  if (!forceFresh) {
    const cached = getCachedCatalog(queryString);
    if (cached.data && !cached.isStale) {
      return cached.data;
    }
  }

  const reqKey = `catalog:${queryString}`;
  const existing = inFlightRequests.get(reqKey);
  if (existing) return existing;

  const url = `/api/products?${queryString}${forceFresh ? '&fresh=1' : ''}`;
  const promise = (async () => {
    try {
      const { ok, data } = await safeFetchJson<CatalogPayload>(
        url,
        forceFresh ? { cache: 'no-store' } : undefined
      );
      if (ok && data) {
        catalogCache.delete(queryString);
        catalogCache.set(queryString, { data, fetchedAt: Date.now() });
        enforceMapLimit(catalogCache, MAX_CATALOG_ENTRIES);
        seedProductsIntoCache(data.products);
        return data;
      }
      return catalogCache.get(queryString)?.data || null;
    } catch {
      return catalogCache.get(queryString)?.data || null;
    } finally {
      inFlightRequests.delete(reqKey);
    }
  })();

  inFlightRequests.set(reqKey, promise);
  return promise;
}

export function getCachedSearch(query: string): Product[] | null {
  const key = query.trim().toLowerCase();
  if (!key) return [];
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > SEARCH_FRESH_TTL) return null;
  return entry.data;
}

export async function fetchSearchWithCache(query: string): Promise<Product[]> {
  const key = query.trim().toLowerCase();
  if (!key) return [];
  const cached = getCachedSearch(key);
  if (cached) return cached;

  const reqKey = `search:${key}`;
  const existing = inFlightRequests.get(reqKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { ok, data } = await safeFetchJson<CatalogPayload>(
        `/api/products?search=${encodeURIComponent(query.trim())}&limit=8`
      );
      if (ok && data && Array.isArray(data.products)) {
        searchCache.delete(key);
        searchCache.set(key, { data: data.products, fetchedAt: Date.now() });
        enforceMapLimit(searchCache, MAX_SEARCH_ENTRIES);
        seedProductsIntoCache(data.products);
        return data.products;
      }
      return [];
    } catch {
      return [];
    } finally {
      inFlightRequests.delete(reqKey);
    }
  })();

  inFlightRequests.set(reqKey, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Cache Invalidation (after checkout or admin mutations)
// ---------------------------------------------------------------------------
export function invalidateHomepageCache() {
  homepageCache = null;
}

export function invalidateProductCache(slugOrId?: string) {
  if (!slugOrId) {
    fullProductCache.clear();
    productSummaryCache.clear();
    catalogCache.clear();
    return;
  }
  const key = slugOrId.trim();
  const slug = productIdToSlug.get(key) || key;
  fullProductCache.delete(key);
  fullProductCache.delete(slug);
  productSummaryCache.delete(key);
  productSummaryCache.delete(slug);
  catalogCache.clear();
}

export function invalidateAllStoreCache() {
  homepageCache = null;
  settingsCache = null;
  fullProductCache.clear();
  productIdToSlug.clear();
  productSummaryCache.clear();
  catalogCache.clear();
  searchCache.clear();
}
