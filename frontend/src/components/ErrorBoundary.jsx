import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Last line of defence. A render crash must not leave a blank screen in
 * front of someone with a queue of patients.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ui] render failed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-sunken px-4">
        <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-state-danger/10 text-state-danger">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink">Something broke on this screen</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Nothing you saved has been lost. Reload the page and try again - if it keeps happening, tell the
            administrator what you were doing.
          </p>
          <p className="mt-3 break-words rounded-md bg-surface-sunken p-2 font-mono text-xs text-ink-subtle">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
          >
            <RotateCcw size={16} /> Reload the page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
