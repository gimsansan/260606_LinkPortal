import { useState, useEffect, useCallback } from 'react';

const INSTANT_DELETE_KEY = 'linkportal-instant-delete';

function getStoredInstantDelete(): boolean {
  return localStorage.getItem(INSTANT_DELETE_KEY) === 'true';
}

export function useInstantDelete() {
  const [instantDelete, setInstantDelete] = useState(getStoredInstantDelete);

  useEffect(() => {
    localStorage.setItem(INSTANT_DELETE_KEY, String(instantDelete));
  }, [instantDelete]);

  const toggleInstantDelete = useCallback(() => {
    setInstantDelete((v) => !v);
  }, []);

  return { instantDelete, setInstantDelete, toggleInstantDelete };
}
