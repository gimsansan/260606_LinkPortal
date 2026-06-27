import { useState, useEffect, useCallback } from 'react';

const AUTO_ADVANCE_KEY = 'linkportal-auto-advance';

function getStoredAutoAdvance(): boolean {
  return localStorage.getItem(AUTO_ADVANCE_KEY) === 'true';
}

export function useAutoAdvance() {
  const [autoAdvance, setAutoAdvance] = useState(getStoredAutoAdvance);

  useEffect(() => {
    localStorage.setItem(AUTO_ADVANCE_KEY, String(autoAdvance));
  }, [autoAdvance]);

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance((v) => !v);
  }, []);

  return { autoAdvance, setAutoAdvance, toggleAutoAdvance };
}
