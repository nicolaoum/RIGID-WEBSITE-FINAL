import type { NextApiRequest, NextApiResponse } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * OAuth callback handler for Cognito
 * Exchanges authorization code for tokens and stores them ONLY in HttpOnly Secure cookies.
 * NEVER exposes tokens in URLs, localStorage, or client-side JavaScript.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests (OAuth redirect)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  if (error) {
    console.error('Authentication error:', error);
    return res.redirect('/?error=auth_failed');
  }

  if (!code || typeof code !== 'string') {
    console.error('No authorization code received');
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange code for tokens server-side
    const tokenUrl = process.env.NEXT_PUBLIC_COGNITO_TOKEN_URL!;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI!;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', errorText);
      return res.redirect('/?error=token_exchange_failed');
    }

    const tokens = await response.json();
    const maxAge = tokens.expires_in || 3600;

    // Store tokens ONLY in HttpOnly, Secure, SameSite=Strict cookies
    // These cookies are NEVER accessible to client-side JavaScript (XSS-proof)
    const securePart = isProduction ? ' Secure;' : '';
    const sameSite = isProduction ? 'Strict' : 'Lax';

    const cookies = [
      `rigid_access_token=${tokens.access_token}; Path=/; Max-Age=${maxAge}; HttpOnly;${securePart} SameSite=${sameSite}`,
      `rigid_id_token=${tokens.id_token}; Path=/; Max-Age=${maxAge}; HttpOnly;${securePart} SameSite=${sameSite}`,
      tokens.refresh_token
        ? `rigid_refresh_token=${tokens.refresh_token}; Path=/; Max-Age=${maxAge * 24}; HttpOnly;${securePart} SameSite=${sameSite}`
        : '',
      // Set a non-sensitive flag cookie so the client knows the user is logged in
      // This contains NO token data — just a boolean signal
      `rigid_logged_in=true; Path=/; Max-Age=${maxAge};${securePart} SameSite=${sameSite}`,
    ].filter(Boolean);

    res.setHeader('Set-Cookie', cookies);

    // Redirect to home with NO tokens in URL — clean redirect only
    res.redirect('/?login=success');
  } catch (err) {
    console.error('Token exchange error:', err);
    res.redirect('/?error=token_exchange_failed');
  }
}
