import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { refreshTokens, isTokenValidForCurrentConfig, clearAuthData } from './auth';

/**
 * Hook to automatically restore user session from localStorage on app startup
 * and refresh tokens every 50 minutes to maintain session
 */
export const useSessionRestore = () => {
  const router = useRouter();

  useEffect(() => {
    // Only run once on initial mount
    if (router.isReady) {
      const savedUser = localStorage.getItem('rigid_user');
      const savedToken = localStorage.getItem('rigid_id_token');

      // If user was previously logged in, validate the token
      if (savedUser && savedToken) {
        // Check if token is valid for current Cognito configuration
        if (!isTokenValidForCurrentConfig()) {
          console.log('Stored token is invalid or from different Cognito pool - clearing auth data');
          clearAuthData();
          // Don't redirect - just clear the stale data so user can log in fresh
        } else {
          console.log('Session restored from localStorage');
        }
      }

      // Set up token refresh interval (every 50 minutes)
      // This keeps the session alive as long as the user has the browser open
      const refreshInterval = setInterval(async () => {
        console.log('Attempting to refresh tokens...');
        const result = await refreshTokens();
        if (!result) {
          console.log('Token refresh failed - clearing auth data');
          clearAuthData();
        }
      }, 50 * 60 * 1000); // 50 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [router.isReady]);
};
