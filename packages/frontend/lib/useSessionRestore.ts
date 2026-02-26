import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { loadUser, refreshTokens, isAuthenticated, clearLegacyData } from './auth';

/**
 * Hook to restore user session from HttpOnly cookies on app startup
 * and refresh tokens every 50 minutes to maintain session.
 * 
 * SECURITY: No tokens in localStorage. User info is fetched from /api/me
 * which reads the HttpOnly cookie server-side.
 */
export const useSessionRestore = () => {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    // Clean up any legacy localStorage tokens from before the security hardening
    clearLegacyData();

    // If the user has a valid session cookie, load their info from the server
    if (isAuthenticated()) {
      loadUser().catch(() => {
        // Token may be expired — try refreshing
        refreshTokens();
      });
    }

    // Set up token refresh interval (every 50 minutes)
    const refreshInterval = setInterval(async () => {
      if (isAuthenticated()) {
        const success = await refreshTokens();
        if (!success) {
          console.log('Token refresh failed — session may have expired');
        }
      }
    }, 50 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [router.isReady]);
};
