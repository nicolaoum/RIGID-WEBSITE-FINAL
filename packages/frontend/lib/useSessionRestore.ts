import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Hook to automatically restore user session from localStorage on app startup
 * This prevents requiring re-login after page refresh or webserver restart
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
    }
  }, [router.isReady]);
};
