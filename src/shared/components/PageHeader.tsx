import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  mobileTitle?: string;
  subtitle?: string;
  hideSubtitleOnMobile?: boolean;
  action?: ReactNode;
}

export function PageHeader({ title, mobileTitle, subtitle, hideSubtitleOnMobile, action }: PageHeaderProps) {
  return (
    <div className="pageheader">
      <div className="pageheader__main">
        {mobileTitle ? (
          <>
            <h1 className="pageheader__title sm:hidden">{mobileTitle}</h1>
            <h1 className="pageheader__title hidden sm:block">{title}</h1>
          </>
        ) : (
          <h1 className="pageheader__title">{title}</h1>
        )}
        {subtitle && (
          <p className={`pageheader__subtitle${hideSubtitleOnMobile ? ' hidden sm:block' : ''}`}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="pageheader__actions">{action}</div>}
    </div>
  );
}
