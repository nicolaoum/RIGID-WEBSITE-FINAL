import { NextApiRequest, NextApiResponse } from 'next';

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/callback';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUrl = `https://${COGNITO_DOMAIN}/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&scope=openid+email&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  
  res.redirect(authUrl);
}
