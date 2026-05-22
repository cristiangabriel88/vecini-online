import { cn } from '@/shared/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skel', className)} style={{ height: 14 }} aria-hidden />;
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} aria-label="Se încarcă" role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card">
          <div className="card__body">
            <div className="skel" style={{ height: 20, width: '50%', marginBottom: 8 }} />
            <div className="skel" style={{ height: 14, width: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
