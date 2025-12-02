import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * OAuth callback handler for Cognito
 * Exchanges authorization code for tokens and redirects with tokens as URL params
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

    // Redirect back to home with tokens as URL params
    // The client-side will pick them up and save to localStorage
    const redirectParams = new URLSearchParams({
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      refresh_token: tokens.refresh_token || '',
      expires_in: tokens.expires_in.toString(),
    });

    res.redirect(`/?${redirectParams.toString()}`);
  } catch (err) {
    console.error('Token exchange error:', err);
    res.redirect('/?error=token_exchange_failed');
  }
}
