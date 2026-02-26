import type { NextApiRequest, NextApiResponse } from 'next'

const targetBase =
  (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

// Allowed API paths — only proxy to known endpoints
const ALLOWED_PATHS = [
  'buildings',
  'units',
  'tickets',
  'notices',
  'residents',
  'inquiries',
  'check-resident',
  'register-resident',
  'get-upload-url',
  'sync-pending-residents',
  'send-announcement-email',
  'invite-codes',
]

// Allowed HTTP methods
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!targetBase) {
    return res.status(500).json({ error: 'API base URL is not configured' })
  }

  // Validate HTTP method
  if (!req.method || !ALLOWED_METHODS.includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || ''

  // Validate path — prevent directory traversal and only allow known routes
  if (path.includes('..') || path.includes('//')) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  const basePath = path.split('/')[0]
  if (!ALLOWED_PATHS.includes(basePath)) {
    return res.status(403).json({ error: 'Forbidden: unknown API endpoint' })
  }

  const search = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const url = `${targetBase}/${path}${search}`

  try {
    // Build headers, filtering out problematic ones
    const headersToForward: Record<string, string> = {}
    const headersToExclude = [
      'host',
      'expect', // Not supported by undici
      'content-length', // Let fetch handle it
      'transfer-encoding',
      'connection',
      'keep-alive',
      'upgrade',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'cookie', // Don't forward raw cookies to backend
    ]

    for (const [key, value] of Object.entries(req.headers)) {
      if (!headersToExclude.includes(key) && typeof value === 'string') {
        headersToForward[key] = value
      }
    }

    // Inject auth token from HttpOnly cookie — the client never sends it directly
    const idToken = req.cookies.rigid_id_token
    if (idToken) {
      headersToForward['authorization'] = `Bearer ${idToken}`
    }

    const init: RequestInit = {
      method: req.method,
      headers: headersToForward as Record<string, string>,
      redirect: 'follow',
    }

    if (req.method && !['GET', 'HEAD'].includes(req.method)) {
      init.body = req.body ? JSON.stringify(req.body) : undefined
      // Ensure content-type for JSON bodies
      if (req.headers['content-type']) {
        (init.headers as Record<string, string>)['content-type'] = req.headers['content-type'] as string
      } else if (init.body) {
        (init.headers as Record<string, string>)['content-type'] = 'application/json'
      }
    }

    const response = await fetch(url, init)
    const contentType = response.headers.get('content-type') || ''
    const status = response.status

    // Forward headers except hop-by-hop
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection', 'keep-alive', 'upgrade', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers'].includes(key)) {
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
    console.error('Proxy error:', error)
    res.status(502).json({ error: 'Proxy request failed', detail: error?.message })
  }
}
