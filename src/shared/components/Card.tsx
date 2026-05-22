import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, footer, className, children, ...rest }: CardProps) {
  return (
    <div className={cn('card', className)} {...rest}>
      {title && (
        <div className="card__header">
          <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, letterSpacing: 'var(--tracking-snug)' }}>
            {title}
          </h3>
        </div>
      )}
      <div className="card__body">{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </div>
  );
}
