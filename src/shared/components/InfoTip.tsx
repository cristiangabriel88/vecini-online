import { useRef, useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTipProps {
  hint: string;
  size?: number;
}

/** Info icon that shows its hint on hover, keyboard focus, and tap (WCAG 1.4.13). */
export function InfoTip({ hint, size = 13 }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false);
  }

  function handleBlur(e: React.FocusEvent) {
    if (!btnRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        aria-label={hint}
        aria-expanded={open}
        className={[
          'inline-flex cursor-help text-muted rounded',
          'hover:text-[hsl(var(--color-accent))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent)/0.5)]',
        ].join(' ')}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      >
        <Info size={size} aria-hidden="true" />
      </button>
      {open && (
        <span
          role="tooltip"
          aria-hidden="true"
          className={[
            'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
            'w-56 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5',
            'text-xs font-medium text-muted shadow-sm whitespace-normal',
            'z-20',
          ].join(' ')}
        >
          {hint}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
        </span>
      )}
    </span>
  );
}
