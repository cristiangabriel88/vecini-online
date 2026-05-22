import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'urgent';

/* Map the app's tones onto the design's badge variants. */
const tones: Record<Tone, string> = {
  neutral: 'badge--neutral',
  primary: 'badge--accent',
  success: 'badge--success',
  warning: 'badge--warning',
  danger: 'badge--danger',
  urgent: 'badge--danger',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn('badge', tones[tone])}>{children}</span>;
}
