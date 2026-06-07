import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { cn } from '@/shared/lib/cn';
import type { GetStartedStep } from './getStartedLogic';

interface Props {
  steps: GetStartedStep[];
  doneCount: number;
  onDismiss: () => void;
}

export function GetStartedChecklist({ steps, doneCount, onDismiss }: Props) {
  const { t } = useTranslation();
  const total = steps.length;

  return (
    <Card className="mb-6 border-primary/20 bg-surface-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{t('getStarted.title')}</p>
          <p className="mt-0.5 text-xs text-muted">
            {t('getStarted.progress', { done: doneCount, total })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          aria-label={t('getStarted.dismiss')}
          className="shrink-0 -mt-1 -mr-1"
        >
          <X size={15} />
        </Button>
      </div>

      <div className="mt-3 w-full rounded-full bg-surface-2 h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={t('getStarted.progress', { done: doneCount, total })}
        />
      </div>

      <ul className="mt-3 space-y-2" role="list">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              to={step.path}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                step.done
                  ? 'pointer-events-none text-muted'
                  : 'hover:bg-surface-2 text-foreground',
              )}
              aria-disabled={step.done}
              tabIndex={step.done ? -1 : 0}
            >
              {step.done ? (
                <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden />
              ) : (
                <Circle size={16} className="shrink-0 text-muted" aria-hidden />
              )}
              <span className={step.done ? 'line-through opacity-60' : undefined}>
                {t(`getStarted.step.${step.key}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          {t('getStarted.dismiss')}
        </button>
      </div>
    </Card>
  );
}
