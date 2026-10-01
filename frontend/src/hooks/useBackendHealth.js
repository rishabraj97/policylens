/**
 * Custom React hooks for PolicyLens
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook to monitor backend API connectivity status
 */
export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    api.checkHealth()
      .then((data) => {
        if (active) {
          setIsHealthy(data?.status === 'healthy');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err);
          setIsHealthy(false);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { isHealthy, loading, error };
}
