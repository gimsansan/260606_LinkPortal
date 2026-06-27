import { useCallback, useRef, useState } from 'react';

export type ToastVariant = 'default' | 'mission' | 'unlock';

export interface ToastItem {
  id: string;
  message: string;
  duration: number;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

interface QueuedToast {
  message: string;
  duration: number;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToast() {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const queueRef = useRef<QueuedToast[]>([]);
  const showingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (showingRef.current || queueRef.current.length === 0) return;

    const next = queueRef.current.shift();
    if (!next) return;

    showingRef.current = true;
    const id = crypto.randomUUID();
    setToast({ id, ...next });

    globalThis.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
      showingRef.current = false;
      processQueue();
    }, next.duration);
  }, []);

  const showToast = useCallback(
    (
      message: string,
      duration = 1000,
      variant: ToastVariant = 'default',
      actionLabel?: string,
      onAction?: () => void,
    ) => {
      queueRef.current.push({ message, duration, variant, actionLabel, onAction });
      processQueue();
    },
    [processQueue],
  );

  return { toast, showToast };
}
