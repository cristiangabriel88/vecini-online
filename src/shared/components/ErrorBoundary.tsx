import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/shared/lib/errorReporting';
import { DefaultErrorFallback } from './DefaultErrorFallback';

interface FallbackArgs {
  error: Error;
  /** Support reference code from the report. */
  reference: string;
  /** Clear the boundary and re-render the children. */
  reset: () => void;
}

interface Props {
  children: ReactNode;
  /** Custom fallback; defaults to a localized full-width `ErrorState`. */
  fallback?: (args: FallbackArgs) => ReactNode;
  /** Telemetry source label (e.g. 'app-shell', 'route'). */
  source?: string;
  /** When any value here changes, the boundary resets (e.g. `[pathname]`). */
  resetKeys?: ReadonlyArray<unknown>;
  onReset?: () => void;
}

interface State {
  error: Error | null;
  reference: string;
}

function changed(a: ReadonlyArray<unknown> = [], b: ReadonlyArray<unknown> = []): boolean {
  return a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
}

/**
 * Global error boundary (T07). Catches render-time errors in its subtree,
 * reports them through the privacy-safe `reportError` hook, and shows a friendly
 * bilingual recovery state instead of a blank screen. Placed both at the app
 * shell (catastrophic failures) and around each route's `Outlet` (a single page
 * crash keeps the shell usable). Resets on navigation via `resetKeys`.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reference: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const report = reportError(error, {
      source: this.props.source ?? 'error-boundary',
      extra: { componentStack: info.componentStack ?? null },
    });
    this.setState({ reference: report.ref });
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && changed(prev.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null, reference: '' });
  };

  render() {
    const { error, reference } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback({ error, reference, reset: this.reset });
      return <DefaultErrorFallback reference={reference} reset={this.reset} />;
    }
    return this.props.children;
  }
}
