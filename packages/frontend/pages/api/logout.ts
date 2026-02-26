import { NextApiRequest, NextApiResponse } from 'next';

const COGNITO_LOGOUT = process.env.NEXT_PUBLIC_COGNITO_LOGOUT;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const LOGOUT_REDIRECT_URI = process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI || 'http://localhost:3000';
const isProduction = process.env.NODE_ENV === 'production';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Clear all token cookies with Secure flag in production
  const securePart = isProduction ? ' Secure;' : '';
  const clearCookie = `Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly;${securePart} SameSite=Lax`;
  const clearPublicCookie = `Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;${securePart} SameSite=Lax`;
  res.setHeader('Set-Cookie', [
    `rigid_id_token=; ${clearCookie}`,
    `rigid_access_token=; ${clearCookie}`,
    `rigid_refresh_token=; ${clearCookie}`,
    `rigid_logged_in=; ${clearPublicCookie}`,
  ]);
  
  if (!COGNITO_LOGOUT || !CLIENT_ID) {
    return res.status(500).send('Cognito logout configuration is missing');
  }

  const url = new URL(COGNITO_LOGOUT);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('logout_uri', LOGOUT_REDIRECT_URI);
  
  res.redirect(url.toString());
}
