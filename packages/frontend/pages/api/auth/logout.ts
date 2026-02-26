import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * /api/auth/logout — Clears all auth cookies and redirects to Cognito logout.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
  const cognitoLogout = process.env.NEXT_PUBLIC_COGNITO_LOGOUT!;
  const logoutRedirect = process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI!;

  // Clear HttpOnly cookies
  res.setHeader('Set-Cookie', [
    'rigid_access_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
    'rigid_id_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
    'rigid_refresh_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
  ]);

  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutRedirect,
  });

  res.redirect(`${cognitoLogout}?${params.toString()}`);
}
