/**
 * Authentication utilities for Cognito Hosted UI
 * Handles login, logout, token management, and session state
 */

const COGNITO_HOSTED_UI = process.env.NEXT_PUBLIC_COGNITO_HOSTED_UI!;
const COGNITO_LOGOUT = process.env.NEXT_PUBLIC_COGNITO_LOGOUT!;
const COGNITO_TOKEN_URL = process.env.NEXT_PUBLIC_COGNITO_TOKEN_URL!;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI!;
const LOGOUT_REDIRECT_URI = process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI!;

const TOKEN_KEY = 'rigid_access_token';
const REFRESH_TOKEN_KEY = 'rigid_refresh_token';
const ID_TOKEN_KEY = 'rigid_id_token';
const USER_KEY = 'rigid_user';

export interface User {
  email: string;
  name?: string;
  sub: string;
  groups?: string[];
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
    scope: 'openid email',
    redirect_uri: REDIRECT_URI,
  });

  window.location.href = `${COGNITO_HOSTED_UI}?${params.toString()}`;
};

/**
 * Logout and redirect to Cognito logout endpoint
 */
export const logout = () => {
  // Clear local tokens
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: LOGOUT_REDIRECT_URI,
  });

  window.location.href = `${COGNITO_LOGOUT}?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = async (code: string): Promise<TokenResponse> => {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(COGNITO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
};

/**
 * Save tokens to localStorage
 */
export const saveTokens = (tokens: TokenResponse) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(ID_TOKEN_KEY, tokens.id_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }

  // Decode and save user info from ID token
  const user = parseJWT(tokens.id_token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

/**
 * Get access token from localStorage or cookies
 */
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first
  const token = localStorage.getItem(ID_TOKEN_KEY);
  if (token) return token;
  
  // Fallback to cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'rigid_id_token') {
      return value;
    }
  }
  
  return null;
};

/**
 * Get ID token from localStorage or cookies
 */
export const getIdToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first
  const token = localStorage.getItem(ID_TOKEN_KEY);
  if (token) return token;
  
  // Fallback to cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'rigid_id_token') {
      // Also save to localStorage for future use
      localStorage.setItem(ID_TOKEN_KEY, value);
      
      // Parse and save user info
      const user = parseJWT(value);
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      
      return value;
    }
  }
  
  return null;
};

/**
 * Get current user from localStorage or parse from token
 */
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    return JSON.parse(userStr);
  }
  
  // Try to get from token
  const token = getIdToken();
  if (token) {
    return parseJWT(token);
  }
  
  return null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};

/**
 * Parse JWT token (simple base64 decode, no verification)
 */
const parseJWT = (token: string): User | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    return {
      email: payload.email,
      name: payload.name,
      sub: payload.sub,
      groups: payload['cognito:groups'],
    };
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
};
