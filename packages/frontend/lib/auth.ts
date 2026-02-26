/**
 * Authentication utilities for Cognito Hosted UI
 * 
 * SECURITY: Tokens are stored ONLY in HttpOnly Secure cookies.
 * Client-side JS never has access to raw JWTs, eliminating XSS token theft.
 * User info is fetched server-side via /api/me.
 */

const COGNITO_HOSTED_UI = process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI!;
const COGNITO_LOGOUT = process.env.NEXT_PUBLIC_COGNITO_LOGOUT!;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI!;
const LOGOUT_REDIRECT_URI = process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI!;

// Legacy localStorage keys — used only for cleanup during migration
const LEGACY_KEYS = ['rigid_access_token', 'rigid_refresh_token', 'rigid_id_token', 'rigid_user'];

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
 * Logout: clear cookies via server endpoint and redirect to Cognito logout
 */
export const logout = () => {
  // Clear any legacy localStorage data
  clearLegacyData();
  // Redirect to server-side logout which clears HttpOnly cookies
  window.location.href = '/api/logout';
};

/**
 * Remove legacy localStorage tokens from before security hardening.
 * Called once on load to clean up any old insecure data.
 */
export const clearLegacyData = () => {
  if (typeof window === 'undefined') return;
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
};

/**
 * Check if user is logged in by reading the non-HttpOnly flag cookie.
 * This does NOT contain any token data — just a boolean signal.
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith('rigid_logged_in='));
};

/**
 * Fetch current user info securely from the server.
 * The server reads the HttpOnly cookie and returns decoded claims.
 * Client JS never sees the raw JWT.
 */
export const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.authenticated) return null;
    return data.user as User;
  } catch {
    return null;
  }
};

/**
 * Get current user (synchronous, from cache only).
 * Use fetchCurrentUser() for authoritative data.
 * Falls back to cached data if available, or null.
 */
let _cachedUser: User | null = null;
export const getCurrentUser = (): User | null => {
  return _cachedUser;
};

/**
 * Load user into cache (call this on app startup)
 */
export const loadUser = async (): Promise<User | null> => {
  _cachedUser = await fetchCurrentUser();
  return _cachedUser;
};

/**
 * Clear cached user
 */
export const clearCachedUser = () => {
  _cachedUser = null;
};

/**
 * Server-side token refresh via the /api/refresh endpoint.
 * Tokens stay in HttpOnly cookies — client never touches them.
 */
export const refreshTokens = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/refresh', {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (res.ok) {
      // Reload user data after refresh
      await loadUser();
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Get access token — returns null because tokens are now in HttpOnly cookies.
 * The proxy reads them server-side. This function exists for API compatibility.
 */
export const getAccessToken = (): string | null => {
  // Tokens are in HttpOnly cookies — the proxy reads them server-side.
  // Return null; the proxy handler injects the Authorization header automatically.
  return null;
};

/**
 * Legacy compatibility — these are no-ops in the secure architecture
 */
export const saveTokens = (_tokens: TokenResponse) => {
  // No-op: tokens are stored in HttpOnly cookies by the server
};
export const getIdToken = (): string | null => null;
export const isTokenValidForCurrentConfig = (): boolean => isAuthenticated();
export const clearAuthData = () => {
  clearLegacyData();
  clearCachedUser();
};
export const exchangeCodeForTokens = async (_code: string): Promise<TokenResponse> => {
  throw new Error('Token exchange is handled server-side via /api/callback');
};
export const fetchUserInfoFromCognito = async (): Promise<User | null> => {
  return fetchCurrentUser();
};

