import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { refreshTokens } from './auth';

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

      // If user was previously logged in, session is automatically restored
      // No action needed - tokens are already in localStorage and will be used by API calls
      if (savedUser && savedToken) {
        console.log('Session restored from localStorage');
      }

      // Set up token refresh interval (every 50 minutes)
      // This keeps the session alive as long as the user has the browser open
      const refreshInterval = setInterval(async () => {
        console.log('Attempting to refresh tokens...');
        await refreshTokens();
      }, 50 * 60 * 1000); // 50 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [router.isReady]);
};
