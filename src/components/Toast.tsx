import type { ToastItem } from '../hooks/useToast';

interface ToastProps {
  toast: ToastItem | null;
}

export function Toast({ toast }: Readonly<ToastProps>) {
  if (!toast) return null;

  return (
    <div className="toast-host" aria-live="polite" aria-atomic="true">
      <div className={`toast toast--${toast.variant}`} role="status">
        {toast.message}
      </div>
    </div>
  );
}
