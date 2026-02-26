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
 * Refresh tokens using refresh token
 */
export const refreshTokens = async (): Promise<TokenResponse | null> => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      console.log('No refresh token available');
      return null;
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    });

    const response = await fetch(COGNITO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      return null;
    }

    const tokens = await response.json();
    saveTokens(tokens);
    console.log('Tokens refreshed successfully');
    return tokens;
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return null;
  }
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
      'custom:apartmentNumber': payload['custom:apartmentNumber'],
      'custom:buildingId': payload['custom:buildingId'],
      phone_number: payload.phone_number,
    };
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
};

/**
 * Check if the stored token is valid for the current Cognito configuration
 * This helps detect when tokens from a different region/pool are stored
 */
export const isTokenValidForCurrentConfig = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem(ID_TOKEN_KEY);
  if (!token) return false;
  
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
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.log('Token is expired');
      return false;
    }
    
    // Check if token issuer matches current Cognito configuration
    // The issuer should contain the current user pool ID
    const expectedPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
    if (expectedPoolId && payload.iss) {
      const issuerContainsPoolId = payload.iss.includes(expectedPoolId);
      if (!issuerContainsPoolId) {
        console.log('Token issuer does not match current Cognito pool. Expected:', expectedPoolId, 'Got:', payload.iss);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Clear all stored auth data (for invalid/stale tokens)
 */
export const clearAuthData = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Fetch user info from Cognito userinfo endpoint to get custom attributes
 */
export const fetchUserInfoFromCognito = async (): Promise<User | null> => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) return null;

    const userInfoUrl = `${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/userinfo`;
    const response = await fetch(userInfoUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user info:', response.status);
      return null;
    }

    const userInfo = await response.json();
    console.log('User info from Cognito:', userInfo);
    
    return {
      email: userInfo.email,
      name: userInfo.name,
      sub: userInfo.sub,
      groups: userInfo['cognito:groups'],
      'custom:apartmentNumber': userInfo['custom:apartmentNumber'],
      'custom:buildingId': userInfo['custom:buildingId'],
      phone_number: userInfo.phone_number,
    };
  } catch (error) {
    console.error('Error fetching user info from Cognito:', error);
    return null;
  }
};

