import { useState, useEffect, useCallback } from 'react';
import { getIsPro } from '../utils/subscription';

export function useSubscription() {
  const [isPro, setIsPro]       = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const pro = await getIsPro();
    setIsPro(pro);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { isPro, isLoading, refresh };
}
