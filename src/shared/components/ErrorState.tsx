import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  body: string;
  /** Support reference code, when the error was reported. */
  reference?: string;
  /** Localized label for the reference code (e.g. "Reference code"). */
  refLabel?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/**
 * Standardized error state (T07). Mirrors `EmptyState`'s layout so error,
 * empty and loading states feel like one family, but carries `role="alert"`
 * for assistive tech and a danger-tinted icon, plus an optional support
 * reference code a resident can quote.
 */
export function ErrorState({ title, body, reference, refLabel, icon, action }: ErrorStateProps) {
  return (
    <div className="empty" role="alert">
      <div className="empty__icon empty__icon--danger" aria-hidden>
        {icon ?? <AlertTriangle size={22} />}
      </div>
      {title && <div className="empty__title">{title}</div>}
      <div className="empty__desc">{body}</div>
      {reference && (
        <div className="error-state__ref">
          {refLabel ? `${refLabel}: ` : ''}
          <code>{reference}</code>
        </div>
      )}
      {action && <div className="error-state__actions">{action}</div>}
    </div>
  );
}
