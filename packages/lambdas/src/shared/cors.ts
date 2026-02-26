/**
 * Shared CORS configuration for all Lambda functions.
 *
 * SECURITY: Only allow requests from known origins.
 * Never use '*' as it allows any website to make requests to the API.
 */

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://rigidresidential.com',
  'https://www.rigidresidential.com',
];

/**
 * Returns the correct Access-Control-Allow-Origin header value
 * based on the incoming request's Origin header.
 * If the origin is not in the allowlist, returns the primary production domain.
 */
export function getAllowedOrigin(requestOrigin?: string): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  // Default to primary production domain for non-browser / unknown callers
  return ALLOWED_ORIGINS[1]; // https://rigidresidential.com
}

/**
 * Build standard CORS headers for a Lambda response.
 * Pass the event's origin header for accurate origin matching.
 */
export function corsHeaders(requestOrigin?: string): Record<string, string | boolean> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}
