import { NextApiRequest, NextApiResponse } from 'next';

const COGNITO_LOGOUT = process.env.NEXT_PUBLIC_COGNITO_LOGOUT;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const LOGOUT_REDIRECT_URI = process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI || 'http://localhost:3000';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Clear all token cookies (no Secure flag for localhost)
  const clearCookie = 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax';
  res.setHeader('Set-Cookie', [
    `rigid_id_token=; ${clearCookie}`,
    `rigid_access_token=; ${clearCookie}`,
    `rigid_refresh_token=; ${clearCookie}`,
  ]);
  
  if (!COGNITO_LOGOUT || !CLIENT_ID) {
    return res.status(500).send('Cognito logout configuration is missing');
  }

  const url = new URL(COGNITO_LOGOUT);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('logout_uri', LOGOUT_REDIRECT_URI);
  
  res.redirect(url.toString());
}
