/**
 * Authentication utilities for Cognito Hosted UI
 * 
 * SECURITY: Tokens are stored ONLY in HttpOnly cookies set by the server.
 * Client-side JavaScript never has access to raw JWT tokens.
 * The proxy (/api/proxy) reads cookies server-side and forwards the auth header.
 * User info is fetched from /api/me which reads the cookie server-side.
 */

const COGNITO_HOSTED_UI = process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI!;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI!;

// Legacy localStorage keys — used only for migration cleanup
const LEGACY_KEYS = ['rigid_access_token', 'rigid_refresh_token', 'rigid_id_token', 'rigid_user'];

// In-memory user cache (lives only for the page session)
let cachedUser: User | null = null;
let userFetchPromise: Promise<User | null> | null = null;

export interface User {
  email: string;
  name?: string;
  sub: string;
  groups?: string[];
  'custom:apartmentNumber'?: string;
  'custom:buildingId'?: string;
  phone_number?: string;
}

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Redirect to Cognito Hosted UI for login
 */
export const login = () => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'openid email profile phone',
    redirect_uri: REDIRECT_URI,
  });

  window.location.href = `${COGNITO_HOSTED_UI}?${params.toString()}`;
};

/**
 * Logout — clears cookies server-side and redirects to Cognito logout
 */
export const logout = () => {
  // Clear legacy localStorage data
  cleanupLegacyStorage();
  cachedUser = null;
  userFetchPromise = null;

  // Server-side route clears HttpOnly cookies and redirects to Cognito
  window.location.href = '/api/auth/logout';
};

/**
 * Remove any legacy tokens from localStorage (migration cleanup)
 */
const cleanupLegacyStorage = () => {
  if (typeof window === 'undefined') return;
  LEGACY_KEYS.forEach((key) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  });
};

/**
 * Fetch the current user from /api/me (reads HttpOnly cookie server-side).
 * Returns cached result if available.
 */
export const fetchCurrentUser = async (): Promise<User | null> => {
  // Return cache if we have it
  if (cachedUser) return cachedUser;

  // Deduplicate concurrent calls
  if (userFetchPromise) return userFetchPromise;

  userFetchPromise = (async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      if (!res.ok) return null;

      const data = await res.json();
      if (data.authenticated && data.user) {
        cachedUser = data.user;
        // Also store in localStorage for synchronous reads by getCurrentUser
        if (typeof window !== 'undefined') {
          localStorage.setItem('rigid_user', JSON.stringify(data.user));
        }
        return data.user;
      }
      return null;
    } catch {
      return null;
    } finally {
      userFetchPromise = null;
    }
  })();

  return userFetchPromise;
};

/**
 * Get current user — synchronous. Returns cached user or localStorage fallback.
 * Call fetchCurrentUser() first for the most up-to-date data.
 */
export const getCurrentUser = (): User | null => {
  if (cachedUser) return cachedUser;
  if (typeof window === 'undefined') return null;

  const userStr = localStorage.getItem('rigid_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      cachedUser = user;
      return user;
    } catch { /* ignore */ }
  }
  return null;
};

/**
 * Get access token — returns a truthy sentinel so existing `if (token)` checks work.
 * The actual token is managed by HttpOnly cookies; the proxy reads it server-side.
 * This is kept for backward compatibility with api.ts which checks `if (token)`.
 */
export const getAccessToken = (): string | null => {
  // If we know the user is logged in, return a sentinel
  if (cachedUser) return 'cookie-managed';
  if (typeof window !== 'undefined' && localStorage.getItem('rigid_user')) return 'cookie-managed';
  return null;
};

/**
 * Get ID token — same as getAccessToken for backward compatibility
 */
export const getIdToken = (): string | null => {
  return getAccessToken();
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

/**
 * Refresh tokens server-side via /api/auth/refresh
 */
export const refreshTokens = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
    });

    if (!res.ok) {
      console.error('Token refresh failed:', res.status);
      cachedUser = null;
      return false;
    }

    // Re-fetch user info with the new token
    cachedUser = null;
    userFetchPromise = null;
    await fetchCurrentUser();
    console.log('Tokens refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return false;
  }
};

/**
 * Check if the session is still valid by calling /api/me
 */
export const isTokenValidForCurrentConfig = (): boolean => {
  // We can't check synchronously with HttpOnly cookies.
  // Return true if we have cached user; the refresh interval will catch expiry.
  return !!cachedUser || !!(typeof window !== 'undefined' && localStorage.getItem('rigid_user'));
};

/**
 * Clear all stored auth data
 */
export const clearAuthData = () => {
  cachedUser = null;
  userFetchPromise = null;
  cleanupLegacyStorage();
};

/**
 * Save tokens — no-op in the secure model (tokens are in HttpOnly cookies)
 * Kept for backward compatibility.
 */
export const saveTokens = (_tokens: TokenResponse) => {
  // No-op — tokens are managed by HttpOnly cookies
};

/**
 * Exchange code for tokens — no-op in the secure model (callback handler does this)
 * Kept for backward compatibility.
 */
export const exchangeCodeForTokens = async (_code: string): Promise<TokenResponse> => {
  throw new Error('Token exchange is handled server-side by /api/callback');
};
