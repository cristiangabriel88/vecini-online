import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, footer, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface sm:shadow-sm',
        className,
      )}
      {...rest}
    >
      {title && (
        <div className="border-b border-border px-4 py-3 text-lg font-semibold">{title}</div>
      )}
      <div className="p-4">{children}</div>
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </div>
  );
}
