import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RotateCcw, TriangleAlert, X } from 'lucide-react';

interface Props {
  app: string;
  children: ReactNode;
  onClose: () => void;
}
interface State {
  error: Error | null;
  attempt: number;
}
// One misbehaving app should only take down its own window, never the whole desktop.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 };
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Window React · ${this.props.app}:`, error, info.componentStack);
  }
  render() {
    const { error, attempt } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="app-crash" role="alert">
        <TriangleAlert size={26} strokeWidth={1.6} />
        <h3>{this.props.app} ran into a problem.</h3>
        <p>
          The rest of your workspace is fine. You can reopen this app or close it.
          {error.message && <code>{error.message.slice(0, 200)}</code>}
        </p>
        <div className="app-crash-actions">
          <button onClick={() => this.setState({ error: null, attempt: attempt + 1 })} autoFocus>
            <RotateCcw size={13} /> Try again
          </button>
          <button onClick={this.props.onClose}>
            <X size={13} /> Close {this.props.app}
          </button>
        </div>
      </div>
    );
  }
}
