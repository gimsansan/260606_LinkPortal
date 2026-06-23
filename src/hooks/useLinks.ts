import { useState, useEffect, useCallback } from 'react';
import type { LinkItem } from '../types';
import { getLinksByCategory } from '../db';

export function useLinks(categoryId: string | null) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!categoryId) {
      setLinks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const items = await getLinksByCategory(categoryId);
    setLinks(items);
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { links, loading, refresh };
}
