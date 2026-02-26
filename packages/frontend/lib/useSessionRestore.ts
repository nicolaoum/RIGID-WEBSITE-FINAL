import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchCurrentUser, refreshTokens, clearAuthData } from './auth';

/**
 * Hook to restore user session from HttpOnly cookies on app startup
 * and refresh tokens every 50 minutes to maintain session.
 *
 * SECURITY: Tokens are never accessed client-side. We call /api/me
 * which reads the HttpOnly cookie server-side and returns user info.
 */
export const useSessionRestore = () => {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    // Clean up any legacy localStorage tokens from old auth flow
    ['rigid_access_token', 'rigid_refresh_token', 'rigid_id_token'].forEach((key) => {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    });

    // Fetch user info from HttpOnly cookie via /api/me
    fetchCurrentUser().then((user) => {
      if (user) {
        console.log('Session restored from HttpOnly cookie');
      } else {
        // No valid session — clear stale localStorage user
        clearAuthData();
      }
    });

    // Set up token refresh interval (every 50 minutes)
    const refreshInterval = setInterval(async () => {
      console.log('Attempting to refresh tokens...');
      const success = await refreshTokens();
      if (!success) {
        console.log('Token refresh failed - clearing auth data');
        clearAuthData();
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [router.isReady]);
};
