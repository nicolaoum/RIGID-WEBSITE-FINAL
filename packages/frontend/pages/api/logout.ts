import { NextApiRequest, NextApiResponse } from 'next';

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const LOGOUT_URI = process.env.NEXT_PUBLIC_LOGOUT_URI || 'http://localhost:3000';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Clear the token cookie
  res.setHeader('Set-Cookie', 'idToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax');
  
  // Redirect to Cognito logout
  const logoutUrl = `https://${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
  
  res.redirect(logoutUrl);
}
