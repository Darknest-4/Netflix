'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Props of {@link Modal}. */
export interface ModalProps {
  open: boolean;
  /** Invoked on backdrop click, Escape, or the close button. */
  onClose: () => void;
  /** Accessible name of the dialog. */
  title: string;
  /** Hides the default header (used by the immersive preview modal). */
  hideHeader?: boolean;
  /** Max width token. */
  size?: 'md' | 'lg' | 'xl';
  children: ReactNode;
}

/** Max width classes per size token. */
const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Accessible modal dialog.
 *
 * Traps focus inside the dialog, closes on Escape, restores focus to the
 * trigger on unmount and locks background scrolling — the behaviours screen
 * reader and keyboard users depend on.
 *
 * @param props - Open state, close handler, title and content.
 * @returns The dialog element, or `null` when closed.
 */
export function Modal({
  open,
  onClose,
  title,
  hideHeader = false,
  size = 'lg',
  children,
}: ModalProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    /**
     * Handles Escape and Tab so focus never leaves the dialog.
     *
     * @param event - Keyboard event.
     */
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => dialogRef.current?.focus(), 20);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button
        type="button"
        aria-label="Bezárás"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-black/75 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`animate-fade-up relative z-10 my-auto w-full ${SIZE_CLASS[size]} overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)] shadow-2xl`}
      >
        {!hideHeader && (
          <header className="flex items-center justify-between border-b border-[var(--surface-border)] px-6 py-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Bezárás"
              className="grid size-9 place-items-center rounded-full bg-white/10 text-lg leading-none hover:bg-white/20"
            >
              ×
            </button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
