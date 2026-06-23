import { useState, useEffect, useCallback } from 'react';
import type { Category } from '../types';
import { getChildCategories, getCategory } from '../db';

export function useCategories(parentId: string | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const children = await getChildCategories(parentId);
    setCategories(children);
    if (parentId) {
      const cat = await getCategory(parentId);
      setCurrent(cat ?? null);
    } else {
      setCurrent(null);
    }
    setLoading(false);
  }, [parentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories, current, loading, refresh };
}
