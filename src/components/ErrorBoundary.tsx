import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Window React:', error, info);
  }
  render() {
    if (this.state.error)
      return (
        <main className="recovery-screen">
          <img src="/icons/window.svg" width="64" alt="" />
          <h1>Let’s open a fresh window.</h1>
          <p>Something unexpected happened. Your saved files are still in this browser.</p>
          <button onClick={() => window.location.reload()}>Reload your workspace</button>
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
        </main>
      );
    return this.props.children;
  }
}
