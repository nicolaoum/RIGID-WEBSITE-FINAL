import type { NextApiRequest, NextApiResponse } from 'next'

const targetBase =
  (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!targetBase) {
    return res.status(500).json({ error: 'API base URL is not configured' })
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || ''
  const search = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const url = `${targetBase}/${path}${search}`

  try {
    const init: RequestInit = {
      method: req.method,
      headers: {
        ...(req.headers as Record<string, string>),
        host: undefined as any, // avoid passing host through
      },
      redirect: 'follow',
    }

    if (req.method && !['GET', 'HEAD'].includes(req.method)) {
      init.body = req.body ? JSON.stringify(req.body) : undefined
      // Ensure content-type for JSON bodies
      if (req.headers['content-type']) {
        init.headers!['content-type'] = req.headers['content-type'] as string
      } else if (init.body) {
        init.headers!['content-type'] = 'application/json'
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
