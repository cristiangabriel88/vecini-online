import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'btn--primary',
  secondary: 'btn--secondary',
  ghost: 'btn--ghost',
  danger: 'btn--danger',
};

const sizes: Record<Size, string> = {
  sm: 'btn--sm',
  md: '',
  lg: 'btn--lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn('btn', variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && (
        <span style={{ display: 'inline-flex', animation: 'iv-spin 700ms linear infinite' }}>
          <Loader2 size={14} aria-hidden />
        </span>
      )}
      {children}
    </button>
  );
});
