import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

const roNumber = new Intl.NumberFormat('ro-RO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a RON amount as `1.234,56 lei`. */
export function formatLei(amount: number): string {
  return `${roNumber.format(amount)} lei`;
}

/** Format a date as `DD.MM.YYYY`. */
export function formatDate(value: Date | string | number): string {
  return format(new Date(value), 'dd.MM.yyyy', { locale: ro });
}

/** Format a time as `HH:mm` (24h). */
export function formatTime(value: Date | string | number): string {
  return format(new Date(value), 'HH:mm', { locale: ro });
}

/** Format a date and time as `DD.MM.YYYY HH:mm`. */
export function formatDateTime(value: Date | string | number): string {
  return format(new Date(value), 'dd.MM.yyyy HH:mm', { locale: ro });
}

/** Long human date like `21 mai 2026`. */
export function formatDateLong(value: Date | string | number): string {
  return format(new Date(value), 'd MMMM yyyy', { locale: ro });
}

/** Month and year like `iunie 2026` (used by the events month view). */
export function formatMonthYear(value: Date | string | number): string {
  return format(new Date(value), 'LLLL yyyy', { locale: ro });
}

const PHONE_RE = /^\+40\s?7\d{2}\s?\d{3}\s?\d{3}$/;

/** Validate a Romanian mobile number in `+40 7XX XXX XXX` form. */
export function isValidRoPhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

/** Normalise a Romanian mobile number to `+40 7XX XXX XXX`. */
export function formatRoPhone(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^40/, '').replace(/^0/, '');
  if (digits.length !== 9) return value;
  return `+40 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}
