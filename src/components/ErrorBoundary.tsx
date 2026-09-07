import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface State {
  error: Error | null;
  stack: string;
}
// Keys that only hold layout/session state; clearing them is always safe. Files, notes and
// preferences are deliberately kept.
const SESSION_KEYS = ['wr:terminal-font', 'wr:terminal-shell', 'wr:shell-token'];
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, stack: '' };
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Window React:', error, info.componentStack);
    this.setState({ stack: info.componentStack || '' });
  }
  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;
    const details = [
      `${error.name}: ${error.message}`,
      error.stack?.split('\n').slice(1, 6).join('\n') || '',
      stack.trim() ? `\nComponent stack:${stack.split('\n').slice(0, 6).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return (
      <main className="recovery-screen">
        <img src="/icons/window.svg" width="64" alt="" />
        <h1>Let’s open a fresh window.</h1>
        <p>Something unexpected happened. Your saved files are still in this browser.</p>
        <div className="recovery-actions">
          <button onClick={() => window.location.reload()} autoFocus>
            Reload your workspace
          </button>
          <button
            onClick={() => {
              SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
              window.location.reload();
            }}
          >
            Reset session and reload
          </button>
          <button
            onClick={() => {
              const data = localStorage.getItem('wr:files') || '[]';
              const anchor = document.createElement('a');
              anchor.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
              anchor.download = 'window-react-recovery.json';
              anchor.click();
            }}
          >
            Export saved files
          </button>
        </div>
        <details className="recovery-details">
          <summary>Technical details</summary>
          <pre>{details}</pre>
          <button onClick={() => void navigator.clipboard?.writeText(details)}>Copy details</button>
        </details>
      </main>
    );
  }
}
