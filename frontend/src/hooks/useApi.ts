import { useState, useEffect } from 'react';
import { toApiUrl } from '../utils/api';

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(toApiUrl(url))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}
