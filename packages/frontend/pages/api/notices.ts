import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API route for notices - proxies requests to AWS Lambda backend
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL;
      if (!apiBaseUrl) {
        return res.status(500).json({ error: 'API base URL not configured' });
      }

      // Forward the request to the backend
      const response = await fetch(`${apiBaseUrl}/notices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
        },
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error('Error proxying notices request:', error);
      res.status(500).json({ error: 'Failed to fetch notices', detail: error?.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
