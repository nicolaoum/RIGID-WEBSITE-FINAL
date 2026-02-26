import type { NextApiRequest, NextApiResponse } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * POST /api/refresh
 * Server-side token refresh using the HttpOnly refresh_token cookie.
 * The client never touches raw tokens — everything stays in HttpOnly cookies.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const refreshToken = req.cookies.rigid_refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const tokenUrl = process.env.NEXT_PUBLIC_COGNITO_TOKEN_URL!;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;

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
      console.error('Token refresh failed:', response.status);
      return res.status(401).json({ error: 'Refresh failed' });
    }

    const tokens = await response.json();
    const maxAge = tokens.expires_in || 3600;

    const securePart = isProduction ? ' Secure;' : '';
    const sameSite = isProduction ? 'Strict' : 'Lax';

    const cookies = [
      `rigid_access_token=${tokens.access_token}; Path=/; Max-Age=${maxAge}; HttpOnly;${securePart} SameSite=${sameSite}`,
      `rigid_id_token=${tokens.id_token}; Path=/; Max-Age=${maxAge}; HttpOnly;${securePart} SameSite=${sameSite}`,
      `rigid_logged_in=true; Path=/; Max-Age=${maxAge};${securePart} SameSite=${sameSite}`,
    ];

    // Refresh tokens from Cognito don't return a new refresh_token, keep existing one
    res.setHeader('Set-Cookie', cookies);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
