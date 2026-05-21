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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="mb-3 text-muted" aria-hidden>
        {icon ?? <Inbox className="h-10 w-10" />}
      </div>
      {title && <h3 className="mb-1 text-lg font-semibold">{title}</h3>}
      <p className="max-w-md text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
