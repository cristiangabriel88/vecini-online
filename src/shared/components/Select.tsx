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
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        className={cn(
          'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-text focus:border-primary focus:ring-2 focus:ring-primary/30',
          error && 'border-danger',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
});
