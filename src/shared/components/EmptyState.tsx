import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  body: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, icon, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden>
        {icon ?? <Inbox size={22} />}
      </div>
      {title && <div className="empty__title">{title}</div>}
      <div className="empty__desc">{body}</div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
