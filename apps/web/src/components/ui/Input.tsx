'use client';

import { useId, type InputHTMLAttributes } from 'react';

/** Props of {@link Input}. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label; never omit it — placeholders are not labels. */
  label: string;
  /** Validation message; also sets `aria-invalid`. */
  error?: string;
  /** Helper text rendered under the field. */
  hint?: string;
}

/**
 * Labelled text input.
 *
 * The label is always rendered (visually and for assistive technology), errors
 * are wired through `aria-describedby`, and the field grows to the full width
 * of its container.
 *
 * @param props - Label, error, hint and native input attributes.
 * @returns The field element.
 */
export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  ...rest
}: InputProps): React.JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`h-12 w-full rounded-md border bg-[var(--surface-overlay)] px-4 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors duration-200 focus:border-nova-red ${
          error ? 'border-danger' : 'border-[var(--surface-border)]'
        } ${className}`}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-sm text-[var(--text-muted)]">
          {hint}
        </p>
      )}
    </div>
  );
}
