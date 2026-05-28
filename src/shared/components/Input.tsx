import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface FieldProps {
  label?: ReactNode;
  hint?: string;
  error?: string;
  suffix?: ReactNode;
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps
>(function Input({ label, hint, error, suffix, className, id, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const inputNode = (
    <input
      ref={ref}
      id={fieldId}
      aria-invalid={!!error}
      aria-describedby={error ? `${fieldId}-err` : undefined}
      className={cn('input', suffix && 'input--with-suffix', className)}
      {...rest}
    />
  );
  return (
    <div className="field">
      {label && (
        <label htmlFor={fieldId} className="field__label">
          {label}
        </label>
      )}
      {suffix ? (
        <div className="input-wrap">
          {inputNode}
          <span className="input-wrap__suffix">{suffix}</span>
        </div>
      ) : (
        inputNode
      )}
      {hint && !error && <p className="field__hint">{hint}</p>}
      {error && (
        <p id={`${fieldId}-err`} className="field__error">
          <Info size={12} /> {error}
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
    <div className="field">
      {label && (
        <label htmlFor={fieldId} className="field__label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-err` : undefined}
        className={cn('textarea', className)}
        {...rest}
      />
      {hint && !error && <p className="field__hint">{hint}</p>}
      {error && (
        <p id={`${fieldId}-err`} className="field__error">
          <Info size={12} /> {error}
        </p>
      )}
    </div>
  );
});
