import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toApiUrl } from '../utils/api';

export function usePageTracker() {
  const location = useLocation();

  useEffect(() => {
    fetch(toApiUrl('/api/analytics/visit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: location.pathname }),
    }).catch(() => {});
  }, [location.pathname]);
}
