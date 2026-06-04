import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type AnimationEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  hint?: string;
  error?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

function parseDate(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-first: JS getDay() returns 0=Sun; (dow+6)%7 => 0=Mon
  const startDow = (firstDay.getDay() + 6) % 7;
  const days: Date[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  const total = Math.ceil(days.length / 7) * 7;
  let extra = 1;
  while (days.length < total) {
    days.push(new Date(year, month + 1, extra++));
  }
  return days;
}

// Generate the 7 short weekday labels starting from Monday
function getWeekdayLabels(lang: string): string[] {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: 'short' });
  // Week of 2024-01-01 is a Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, 1 + i); // Mon Jan 1 2024 ... Sun Jan 7 2024
    return fmt.format(d);
  });
}

function formatDisplay(iso: string, lang: string): string {
  const d = parseDate(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

function formatMonthYear(year: number, month: number, lang: string): string {
  return new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
}

function formatAriaDay(d: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function DatePicker({
  value,
  onChange,
  label,
  hint,
  error,
  disabled,
  min,
  max,
  placeholder,
}: DatePickerProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language ?? 'ro';

  const autoId = useId();
  const hintId = hint && !error ? `${autoId}-hint` : undefined;
  const errId = error ? `${autoId}-err` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });

  const parsed = parseDate(value);
  const [viewYear, setViewYear] = useState(() => parsed?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsed?.getMonth() ?? new Date().getMonth());

  const weekdays = getWeekdayLabels(lang);
  const days = getCalendarDays(viewYear, viewMonth);

  const openPicker = useCallback(() => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const PICKER_HEIGHT = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < PICKER_HEIGHT && rect.top > PICKER_HEIGHT;
    setPos({
      top: openUp ? rect.top - PICKER_HEIGHT - 6 : rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - 292),
      openUp,
    });
    // Sync view to current value
    const d = parseDate(value);
    setViewYear(d?.getFullYear() ?? new Date().getFullYear());
    setViewMonth(d?.getMonth() ?? new Date().getMonth());
    setMounted(true);
    setOpen(true);
    setClosing(false);
  }, [disabled, value]);

  const closePicker = useCallback(() => {
    setClosing(true);
  }, []);

  const teardown = useCallback(() => {
    setOpen(false);
    setClosing(false);
    setMounted(false);
  }, []);

  const handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (!closing) return;
    // Match every close-animation variant: `iv-dp-out` (down), `iv-dp-out-up`
    // (open-up), and `iv-fade-out` (prefers-reduced-motion fallback).
    if (
      e.animationName === 'iv-dp-out' ||
      e.animationName === 'iv-dp-out-up' ||
      e.animationName === 'iv-fade-out'
    ) {
      teardown();
    }
  };

  // Fallback unmount. `onAnimationEnd` drives the snappy teardown, but if the
  // close animation is suppressed (prefers-reduced-motion may set
  // `animation: none`) the event never fires and the popover would linger,
  // trapping pointer events. A timer guarantees teardown regardless.
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(teardown, 260);
    return () => window.clearTimeout(timer);
  }, [closing, teardown]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !popoverRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        closePicker();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closePicker]);

  // Keyboard on popover
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closePicker(); triggerRef.current?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, closePicker]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectDay = (d: Date) => {
    const iso = toIso(d);
    onChange(iso);
    closePicker();
    triggerRef.current?.focus();
  };

  const isDayDisabled = (d: Date): boolean => {
    const iso = toIso(d);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const isOutside = (d: Date) => d.getMonth() !== viewMonth;

  const displayValue = formatDisplay(value, lang);

  return (
    <div className="field">
      {label && (
        <label htmlFor={autoId} className="field__label">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={autoId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn('dp-trigger', !displayValue && 'dp-trigger--placeholder', disabled && 'dp-trigger--disabled')}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
        }}
      >
        <span className="dp-trigger__value">
          {displayValue || (placeholder ?? '')}
        </span>
        <CalendarDays size={15} className="dp-trigger__icon" aria-hidden="true" />
      </button>
      {hint && !error && <p id={hintId} className="field__hint">{hint}</p>}
      {error && (
        <p id={errId} className="field__error">
          <Info size={12} /> {error}
        </p>
      )}

      {mounted && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label="calendar"
          className="dp-popover"
          data-open-up={pos.openUp}
          style={{ top: pos.top, left: pos.left }}
          data-state={closing ? 'closing' : 'open'}
          onAnimationEnd={handleAnimationEnd}
        >
          <div className="dp-header">
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              onClick={prevMonth}
              aria-label="previous month"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="dp-header__label">
              {formatMonthYear(viewYear, viewMonth, lang)}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              onClick={nextMonth}
              aria-label="next month"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="dp-weekdays" aria-hidden="true">
            {weekdays.map((wd) => (
              <span key={wd} className="dp-weekday">{wd}</span>
            ))}
          </div>

          <div className="dp-grid">
            {days.map((d, i) => {
              const iso = toIso(d);
              const isSelected = iso === value;
              const isToday = iso === TODAY;
              const outside = isOutside(d);
              const disab = isDayDisabled(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disab}
                  aria-label={formatAriaDay(d, lang)}
                  aria-pressed={isSelected}
                  className={cn(
                    'dp-day',
                    isSelected && 'dp-day--selected',
                    isToday && !isSelected && 'dp-day--today',
                    outside && 'dp-day--outside',
                    disab && 'dp-day--disabled',
                  )}
                  onClick={() => !disab && selectDay(d)}
                  tabIndex={isSelected ? 0 : -1}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
