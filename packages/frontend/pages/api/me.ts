import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * /api/me — Returns the current user's info from the HttpOnly id_token cookie.
 * The client can call this to know who is logged in without ever touching the raw JWT.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const idToken = req.cookies.rigid_id_token;

  if (!idToken) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    // Decode JWT payload (second segment)
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonPayload);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return res.status(401).json({ authenticated: false, reason: 'expired' });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        email: payload.email,
        name: payload.name,
        sub: payload.sub,
        groups: payload['cognito:groups'] || [],
        'custom:apartmentNumber': payload['custom:apartmentNumber'],
        'custom:buildingId': payload['custom:buildingId'],
        phone_number: payload.phone_number,
      },
    });
  } catch {
    return res.status(401).json({ authenticated: false, reason: 'invalid_token' });
  }
}
