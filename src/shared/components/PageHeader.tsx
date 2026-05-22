import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="pageheader">
      <div className="pageheader__main">
        <h1 className="pageheader__title">{title}</h1>
        {subtitle && <p className="pageheader__subtitle">{subtitle}</p>}
      </div>
      {action && <div className="pageheader__actions">{action}</div>}
    </div>
  );
}
