import type { NextApiRequest, NextApiResponse } from 'next'

const targetBase =
  (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

// ── Rate limiter (in-memory, per-IP) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100; // max requests per window per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Only allow proxying to known API paths to prevent SSRF
const ALLOWED_PATH_PREFIXES = [
  'units', 'buildings', 'inquiries', 'tickets', 'notices',
  'check-resident', 'residents', 'upload-url',
];

function isAllowedPath(pathStr: string): boolean {
  const firstSegment = pathStr.split('/')[0];
  return ALLOWED_PATH_PREFIXES.includes(firstSegment);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!targetBase) {
    return res.status(500).json({ error: 'API base URL is not configured' })
  }

  // ── Rate limiting ──
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || ''

  // ── Path validation to prevent SSRF ──
  if (!isAllowedPath(path)) {
    return res.status(403).json({ error: 'Forbidden path' });
  }

  // Strip internal proxy query params, keep only legitimate ones
  const url = new URL(`${targetBase}/${path}`);
  if (req.url?.includes('?')) {
    const originalParams = new URL(`http://localhost${req.url}`).searchParams;
    // Only forward safe query params (exclude path which is Next.js internal)
    originalParams.forEach((value, key) => {
      if (key !== 'path') {
        url.searchParams.set(key, value);
      }
    });
  }

  try {
    // ── Build headers — only forward safe, known headers ──
    const headersToForward: Record<string, string> = {};

    // Read auth token from HttpOnly cookie (server-side only — never exposed to JS)
    const idToken = req.cookies.rigid_id_token;
    if (idToken) {
      headersToForward['Authorization'] = `Bearer ${idToken}`;
    }

    // Forward content-type if present
    if (req.headers['content-type'] && typeof req.headers['content-type'] === 'string') {
      headersToForward['content-type'] = req.headers['content-type'];
    }

    // Forward client Authorization header as fallback (for backwards compat during migration)
    if (!idToken && req.headers['authorization'] && typeof req.headers['authorization'] === 'string') {
      headersToForward['Authorization'] = req.headers['authorization'];
    }

    const init: RequestInit = {
      method: req.method,
      headers: headersToForward,
      redirect: 'follow',
    }

    if (req.method && !['GET', 'HEAD'].includes(req.method)) {
      init.body = req.body ? JSON.stringify(req.body) : undefined
      if (init.body && !headersToForward['content-type']) {
        headersToForward['content-type'] = 'application/json'
      }
    }

    const response = await fetch(url.toString(), init)
    const contentType = response.headers.get('content-type') || ''
    const status = response.status

    // Only forward safe response headers
    const safeResponseHeaders = ['content-type', 'cache-control', 'etag', 'last-modified'];
    response.headers.forEach((value, key) => {
      if (safeResponseHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value)
      }
    })

    if (contentType.includes('application/json')) {
      const data = await response.json()
      res.status(status).json(data)
    } else {
      const buffer = await response.arrayBuffer()
      res.status(status).send(Buffer.from(buffer))
    }
  } catch (error: any) {
    console.error('Proxy error:', error?.message)
    // Don't leak internal error details to client
    res.status(502).json({ error: 'Request failed' })
  }
}
