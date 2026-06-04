/**
 * T230 — Tap-accessible status tooltips (WCAG 1.4.13).
 *
 * Tests are written against minimal replicas of the two affected patterns so
 * we avoid the cost of mocking Supabase, i18n, and all feature stores.
 *
 * Patterns tested:
 *  1. ApartmentStatusCell-style tap-toggle wrapper (static icon, no button child)
 *  2. InfoTip component (form info icons)
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { InfoTip } from '../../src/shared/components/InfoTip';

// ---------------------------------------------------------------------------
// Minimal replica of the non-button ApartmentStatusCell wrapper pattern
// ---------------------------------------------------------------------------

function StatusCell({ label }: { label: string }) {
  const [tipOpen, setTipOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleWrapperKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setTipOpen(false); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setTipOpen((o) => !o);
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
      setTipOpen(false);
    }
  }

  return (
    <div
      ref={wrapperRef}
      data-testid="status-wrapper"
      aria-label={label}
      tabIndex={0}
      onClick={() => setTipOpen((o) => !o)}
      onKeyDown={handleWrapperKeyDown}
      onBlur={handleBlur}
    >
      <span aria-hidden="true">icon</span>
      <span
        role="tooltip"
        aria-hidden="true"
        data-testid="status-tooltip"
        style={{ opacity: tipOpen ? 1 : 0 }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApartmentStatusCell pattern
// ---------------------------------------------------------------------------

describe('ApartmentStatusCell tap-toggle pattern (T230)', () => {
  it('wrapper is keyboard-focusable (has tabIndex 0)', () => {
    render(<StatusCell label="Joined 1 Jan 2026" />);
    const wrapper = screen.getByTestId('status-wrapper');
    expect(wrapper.getAttribute('tabindex')).toBe('0');
  });

  it('tooltip is initially hidden', () => {
    render(<StatusCell label="Not registered" />);
    const tip = screen.getByTestId('status-tooltip');
    expect(tip).toHaveStyle({ opacity: 0 });
  });

  it('clicking the wrapper reveals the tooltip', () => {
    render(<StatusCell label="Joined 3 Jun 2026" />);
    const wrapper = screen.getByTestId('status-wrapper');
    fireEvent.click(wrapper);
    expect(screen.getByTestId('status-tooltip')).toHaveStyle({ opacity: 1 });
  });

  it('clicking the wrapper a second time hides the tooltip', () => {
    render(<StatusCell label="Joined 3 Jun 2026" />);
    const wrapper = screen.getByTestId('status-wrapper');
    fireEvent.click(wrapper);
    fireEvent.click(wrapper);
    expect(screen.getByTestId('status-tooltip')).toHaveStyle({ opacity: 0 });
  });

  it('Escape key closes the tooltip', () => {
    render(<StatusCell label="Not registered" />);
    const wrapper = screen.getByTestId('status-wrapper');
    fireEvent.click(wrapper);
    fireEvent.keyDown(wrapper, { key: 'Escape' });
    expect(screen.getByTestId('status-tooltip')).toHaveStyle({ opacity: 0 });
  });

  it('Enter key toggles the tooltip open', () => {
    render(<StatusCell label="Not registered" />);
    const wrapper = screen.getByTestId('status-wrapper');
    fireEvent.keyDown(wrapper, { key: 'Enter' });
    expect(screen.getByTestId('status-tooltip')).toHaveStyle({ opacity: 1 });
  });

  it('Space key toggles the tooltip open', () => {
    render(<StatusCell label="Not registered" />);
    const wrapper = screen.getByTestId('status-wrapper');
    fireEvent.keyDown(wrapper, { key: ' ' });
    expect(screen.getByTestId('status-tooltip')).toHaveStyle({ opacity: 1 });
  });

  it('wrapper carries aria-label with the tooltip text', () => {
    render(<StatusCell label="Joined 3 Jun 2026" />);
    expect(screen.getByLabelText('Joined 3 Jun 2026')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// InfoTip component
// ---------------------------------------------------------------------------

describe('InfoTip component (T230)', () => {
  it('renders an accessible button with the hint as aria-label', () => {
    render(<InfoTip hint="Floor number is optional" />);
    expect(screen.getByRole('button', { name: 'Floor number is optional' })).toBeInTheDocument();
  });

  it('tooltip is not rendered initially', () => {
    render(<InfoTip hint="Some hint" />);
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('clicking the button shows the tooltip text', () => {
    render(<InfoTip hint="Some hint" />);
    fireEvent.click(screen.getByRole('button'));
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip).toBeInTheDocument();
    expect(tip).toHaveTextContent('Some hint');
  });

  it('clicking the button again hides the tooltip', () => {
    render(<InfoTip hint="Some hint" />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('Escape key closes the tooltip', () => {
    render(<InfoTip hint="Some hint" />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.keyDown(btn, { key: 'Escape' });
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('button has aria-expanded reflecting open state', () => {
    render(<InfoTip hint="Some hint" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});
