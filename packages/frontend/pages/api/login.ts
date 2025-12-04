import { NextApiRequest, NextApiResponse } from 'next';

const HOSTED_UI = process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/callback';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!HOSTED_UI || !CLIENT_ID) {
    return res.status(500).send('Cognito Hosted UI configuration is missing');
  }

  const url = new URL(HOSTED_UI);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email');
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  
  res.redirect(url.toString());
}
