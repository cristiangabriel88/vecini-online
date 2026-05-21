import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
}

const baseField =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-text placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/30';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps
>(function Input({ label, hint, error, className, id, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-err` : undefined}
        className={cn(baseField, error && 'border-danger', className)}
        {...rest}
      />
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      {error && (
        <p id={`${fieldId}-err`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function Textarea({ label, hint, error, className, id, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(baseField, 'min-h-[96px]', error && 'border-danger', className)}
        {...rest}
      />
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
});
