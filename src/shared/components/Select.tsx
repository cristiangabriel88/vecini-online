import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errId = error ? `${fieldId}-err` : undefined;
  return (
    <div className="field">
      {label && (
        <label htmlFor={fieldId} className="field__label">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={errId}
        className={cn('input', className)}
        {...rest}
      >
        {children}
      </select>
      {error && <p id={errId} className="field__error">{error}</p>}
    </div>
  );
});
