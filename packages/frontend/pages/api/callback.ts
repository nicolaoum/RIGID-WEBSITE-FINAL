import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * OAuth callback handler for Cognito
 * Exchanges authorization code for tokens and stores them ONLY in HttpOnly cookies.
 * Tokens are NEVER exposed in URLs or to client-side JavaScript.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error } = req.query;

  console.log('Callback received:', { code: code ? 'present' : 'missing', error });

  if (error) {
    console.error('Authentication error:', error);
    return res.redirect('/?error=auth_failed');
  }

  if (!code || typeof code !== 'string') {
    console.error('No authorization code received');
    return res.redirect('/?error=no_code');
  }

  try {
    // Exchange code for tokens
    const tokenUrl = process.env.NEXT_PUBLIC_COGNITO_TOKEN_URL!;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI!;

    console.log('Exchanging code for tokens with redirect_uri:', redirectUri);

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

    // Store tokens ONLY in HttpOnly Secure cookies — never in URL
    const maxAge = tokens.expires_in || 3600;
    const isSecure = process.env.NODE_ENV === 'production';
    const secureSuffix = isSecure ? '; Secure' : '';

    const cookies = [
      `rigid_access_token=${tokens.access_token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureSuffix}`,
      `rigid_id_token=${tokens.id_token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureSuffix}`,
    ];

    if (tokens.refresh_token) {
      cookies.push(
        `rigid_refresh_token=${tokens.refresh_token}; Path=/; Max-Age=${maxAge * 24}; HttpOnly; SameSite=Lax${secureSuffix}`
      );
    }

    res.setHeader('Set-Cookie', cookies);

    // Redirect with a simple flag — no tokens in URL
    res.redirect('/?auth=success');
  } catch (err) {
    console.error('Token exchange error:', err);
    res.redirect('/?error=token_exchange_failed');
  }
}
