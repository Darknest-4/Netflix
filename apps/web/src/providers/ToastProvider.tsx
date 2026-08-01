'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** A transient message shown in the bottom-right corner. */
interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface ToastContextValue {
  /**
   * Shows a toast for four seconds.
   *
   * @param message - Text to display.
   * @param tone - Visual tone.
   */
  notify: (message: string, tone?: Toast['tone']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Tailwind classes per tone. */
const TONE_CLASS: Record<Toast['tone'], string> = {
  info: 'border-[var(--surface-border)] bg-ink-850 text-ink-100',
  success: 'border-success/40 bg-ink-850 text-success',
  error: 'border-danger/40 bg-ink-850 text-danger',
};

/**
 * Toast provider.
 *
 * Messages are announced through an ARIA live region so screen reader users
 * receive the same feedback as sighted users.
 *
 * @param props.children - Application tree.
 * @returns The provider element.
 */
export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info'): void => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <output
            key={toast.id}
            className={`animate-fade-up rounded-lg border px-4 py-3 text-sm shadow-xl backdrop-blur ${TONE_CLASS[toast.tone]}`}
          >
            {toast.message}
          </output>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Accesses the toast context.
 *
 * @returns The toast value; a no-op outside of the provider.
 */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? { notify: () => undefined };
}
