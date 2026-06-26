import { NextRequest, NextResponse } from 'next/server';
import categoriesFallback from './categories-fallback.json';
import statsFallback from './stats-fallback.json';

const GOV_API_URL = process.env.GOV_API_URL || 'https://api.posokanei.gov.gr';

type CacheEntry = { data: unknown; timestamp: number };

const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_BY_PATH: Array<[RegExp, number]> = [
  [/^products\//, 60 * 1000],
  [/^meta\/categories/, 6 * 60 * 60 * 1000],
  [/^offers/, 10 * 60 * 1000],
  [/^meta\/stats$/, 15 * 60 * 1000]
];
const DEFAULT_CACHE_TTL = 15 * 60 * 1000;
const STALE_CACHE_TTL = 24 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 12_000;

function cacheTtlForPath(targetPath: string) {
  return CACHE_TTL_BY_PATH.find(([pattern]) => pattern.test(targetPath))?.[1] || DEFAULT_CACHE_TTL;
}

function getCache(cacheKey: string, ttl: number) {
  const cached = apiCache.get(cacheKey);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  return {
    data: cached.data,
    isFresh: age < ttl,
    isStaleUsable: age < STALE_CACHE_TTL
  };
}

function cacheResponse(cacheKey: string, data: unknown) {
  apiCache.set(cacheKey, { data, timestamp: Date.now() });
}

function canUseStaleCache(targetPath: string) {
  return !/^products(\/|$)/.test(targetPath) && !targetPath.startsWith('offers');
}

function shouldBypassCache(req: NextRequest) {
  return (
    req.headers.get('x-kallathaki-refresh') === '1' ||
    req.headers.get('cache-control')?.includes('no-cache') ||
    req.nextUrl.searchParams.get('_refresh') === '1'
  );
}

function upstreamSearchParams(req: NextRequest) {
  const searchParams = new URLSearchParams(req.nextUrl.searchParams);
  searchParams.delete('_refresh');
  return searchParams.toString();
}

function jsonWithSource(data: unknown, init?: ResponseInit, source?: string) {
  const response = NextResponse.json(data, init);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  if (source) response.headers.set('x-kallathaki-data-source', source);
  return response;
}

function upstreamHeaders(contentType = false) {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
    'Origin': 'https://posokanei.gov.gr',
    'Referer': 'https://posokanei.gov.gr/'
  };
  if (contentType) headers['Content-Type'] = 'application/json';
  return headers;
}

async function proxyImage(url: string, targetPath: string) {
  try {
    const response = await fetch(url, {
      headers: {
        ...upstreamHeaders(),
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      cache: 'force-cache',
      next: { revalidate: 60 * 60 * 24 }
    });

    if (!response.ok) {
      console.error('[Gov image upstream failed]', {
        targetPath,
        status: response.status,
        statusText: response.statusText
      });
      return new NextResponse(null, { status: response.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/png');
    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return new NextResponse(response.body, { status: response.status, headers });
  } catch (error) {
    console.error('[Gov image request error]', { targetPath, url, error });
    return new NextResponse(null, { status: 502 });
  }
}

async function fetchUpstream(url: string, init: RequestInit, targetPath: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal
    });
    const durationMs = Date.now() - startedAt;
    const text = await response.text();

    if (!response.ok) {
      console.error('[Gov API upstream failed]', {
        targetPath,
        status: response.status,
        statusText: response.statusText,
        durationMs,
        bodyPreview: text.slice(0, 300)
      });
      return { ok: false as const, status: response.status, statusText: response.statusText, body: text };
    }

    try {
      return { ok: true as const, data: JSON.parse(text), status: response.status };
    } catch (error) {
      console.error('[Gov API invalid JSON]', {
        targetPath,
        status: response.status,
        durationMs,
        bodyPreview: text.slice(0, 300),
        error
      });
      return { ok: false as const, status: 502, statusText: 'Invalid upstream JSON', body: text };
    }
  } catch (error) {
    console.error('[Gov API request error]', { targetPath, url, error });
    return { ok: false as const, status: 502, statusText: 'Upstream request failed', body: '' };
  } finally {
    clearTimeout(timeout);
  }
}

function staticFallbackForGet(targetPath: string) {
  if (targetPath === 'meta/categories/tree') return categoriesFallback;
  if (targetPath === 'meta/stats') return statsFallback;

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const searchParams = upstreamSearchParams(req);
  const targetPath = path.join('/');
  const url = `${GOV_API_URL}/${targetPath}${searchParams ? `?${searchParams}` : ''}`;
  if (targetPath.startsWith('images/')) {
    return proxyImage(url, targetPath);
  }

  const cacheKey = `GET:${url}`;
  const ttl = cacheTtlForPath(targetPath);
  const bypassCache = shouldBypassCache(req);
  const cached = bypassCache ? null : getCache(cacheKey, ttl);

  if (cached?.isFresh) {
    return jsonWithSource(cached.data, undefined, 'cache');
  }

  const upstream = await fetchUpstream(url, { headers: upstreamHeaders() }, targetPath);
  if (upstream.ok) {
    cacheResponse(cacheKey, upstream.data);
    return jsonWithSource(upstream.data, undefined, 'upstream');
  }

  if (cached?.isStaleUsable && canUseStaleCache(targetPath)) {
    console.warn('[Gov API stale GET fallback]', { targetPath, status: upstream.status });
    return jsonWithSource(cached.data, undefined, 'stale-cache');
  }

  const fallback = staticFallbackForGet(targetPath);
  if (fallback) {
    console.warn('[Gov API static GET fallback]', { targetPath, status: upstream.status });
    return jsonWithSource(fallback, undefined, 'static-fallback');
  }

  return jsonWithSource(
    { error: `Gov API returned ${upstream.status}`, targetPath },
    { status: upstream.status },
    'error'
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const url = `${GOV_API_URL}/${targetPath}`;
  const body = await req.json();
  const cacheKey = `POST:${url}:${JSON.stringify(body)}`;
  const ttl = cacheTtlForPath(targetPath);
  const bypassCache = shouldBypassCache(req);
  const cached = bypassCache ? null : getCache(cacheKey, ttl);

  if (cached?.isFresh) {
    return jsonWithSource(cached.data, undefined, 'cache');
  }

  const upstream = await fetchUpstream(
    url,
    {
      method: 'POST',
      headers: upstreamHeaders(true),
      body: JSON.stringify(body)
    },
    targetPath
  );

  if (upstream.ok) {
    cacheResponse(cacheKey, upstream.data);
    return jsonWithSource(upstream.data, undefined, 'upstream');
  }

  if (cached?.isStaleUsable && canUseStaleCache(targetPath)) {
    console.warn('[Gov API stale POST fallback]', { targetPath, status: upstream.status });
    return jsonWithSource(cached.data, undefined, 'stale-cache');
  }

  if (targetPath === 'products/search') {
    console.warn('[Gov API products/search unavailable]', { targetPath, status: upstream.status });
  }

  return jsonWithSource(
    { error: `Gov API returned ${upstream.status}`, targetPath },
    { status: upstream.status },
    'error'
  );
}
