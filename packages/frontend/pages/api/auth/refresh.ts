import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * /api/auth/refresh — Refreshes tokens using the HttpOnly refresh_token cookie.
 * Sets new HttpOnly cookies with the fresh tokens. The client never sees raw tokens.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const refreshToken = req.cookies.rigid_refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const tokenUrl = process.env.NEXT_PUBLIC_COGNITO_TOKEN_URL!;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      // Clear stale cookies
      res.setHeader('Set-Cookie', [
        'rigid_access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
        'rigid_id_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
        'rigid_refresh_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
      ]);
      return res.status(401).json({ error: 'Refresh failed' });
    }

    const tokens = await response.json();
    const maxAge = tokens.expires_in || 3600;
    const isSecure = process.env.NODE_ENV === 'production';
    const secureSuffix = isSecure ? '; Secure' : '';

    const cookies = [
      `rigid_access_token=${tokens.access_token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureSuffix}`,
      `rigid_id_token=${tokens.id_token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureSuffix}`,
    ];

    // Refresh token is not always returned on refresh grant
    if (tokens.refresh_token) {
      cookies.push(
        `rigid_refresh_token=${tokens.refresh_token}; Path=/; Max-Age=${maxAge * 24}; HttpOnly; SameSite=Lax${secureSuffix}`
      );
    }

    res.setHeader('Set-Cookie', cookies);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Token refresh error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
