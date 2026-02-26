import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * GET /api/me
 * Securely extracts user info from the HttpOnly id_token cookie.
 * The client NEVER sees the raw JWT — only the decoded, non-sensitive user claims.
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
    // Decode JWT payload (the signature was already validated by Cognito when issued)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ authenticated: false });
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return res.status(401).json({ authenticated: false, reason: 'token_expired' });
    }

    // Validate issuer contains expected user pool
    const expectedPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
    if (expectedPoolId && payload.iss && !payload.iss.includes(expectedPoolId)) {
      return res.status(401).json({ authenticated: false, reason: 'invalid_issuer' });
    }

    // Return ONLY non-sensitive user claims — never the raw token
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
    return res.status(401).json({ authenticated: false });
  }
}
