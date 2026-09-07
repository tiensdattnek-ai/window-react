// Client side of the real terminal: a small, framework-free WebSocket session that talks to
// server/pty.js. The React component only wires it to xterm.js.
export interface ShellChoice {
  id: string;
  name: string;
}
export interface ShellInfo {
  shell: string;
  shellName: string;
  cwd: string;
  /** The Window React project folder on the host, for the “go to project” quick action. */
  root: string;
  pid: number;
  platform: string;
  buildNumber?: number;
  user: string;
  host: string;
  shells: ShellChoice[];
}
export type ShellMessage =
  | ({ type: 'ready' } & ShellInfo)
  | { type: 'output'; data: string }
  | { type: 'exit'; code: number; signal: number | null }
  | { type: 'error'; message: string; code?: string };
export type ShellState = 'connecting' | 'running' | 'exited' | 'error';
export interface ShellHandlers {
  onReady?: (info: ShellInfo) => void;
  onOutput?: (data: string) => void;
  onExit?: (code: number, signal: number | null) => void;
  onError?: (message: string, code?: string) => void;
  onClose?: () => void;
}
export interface ShellOptions extends ShellHandlers {
  cols: number;
  rows: number;
  shell?: string;
  token?: string;
  url?: string;
  /** Injected in tests; defaults to the browser WebSocket. */
  factory?: (url: string) => WebSocket;
}
export const TOKEN_KEY = 'wr:shell-token';
export function shellUrl(location: Pick<Location, 'protocol' | 'host'> = window.location) {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/shell`;
}
export function parseMessage(raw: unknown): ShellMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const message = JSON.parse(raw) as { type?: unknown };
    if (!message || typeof message.type !== 'string') return null;
    return message as ShellMessage;
  } catch {
    return null;
  }
}
export function describeClose(code: number, reason: string, connecting = false) {
  if (code === 1000 || code === 1005) return reason && reason !== 'shell exited' ? reason : '';
  if (code === 1006)
    return connecting
      ? 'Could not open a shell. If Window React runs behind a proxy, allow its origin with WR_SHELL_ORIGINS.'
      : 'The connection to the Node.js server was lost.';
  if (code === 1013) return reason || 'The server is busy.';
  return reason || `The connection closed (${code}).`;
}
export class ShellSession {
  state: ShellState = 'connecting';
  info: ShellInfo | null = null;
  private socket: WebSocket;
  private handlers: ShellHandlers;
  private closedByUser = false;
  private failed = false;
  constructor({ cols, rows, shell, token, url, factory, ...handlers }: ShellOptions) {
    this.handlers = handlers;
    this.socket = (factory || ((address) => new WebSocket(address)))(url || shellUrl());
    this.socket.onopen = () => {
      this.send({
        type: 'start',
        cols,
        rows,
        shell: shell || undefined,
        token: token || undefined,
      });
    };
    this.socket.onmessage = (event) => {
      const message = parseMessage(event.data);
      if (!message) return;
      if (message.type === 'ready') {
        const { type: _type, ...info } = message;
        this.state = 'running';
        this.info = info;
        this.handlers.onReady?.(info);
      } else if (message.type === 'output') this.handlers.onOutput?.(message.data);
      else if (message.type === 'exit') {
        this.state = 'exited';
        this.handlers.onExit?.(message.code, message.signal);
      } else if (message.type === 'error') this.fail(message.message, message.code);
    };
    this.socket.onerror = () => {
      if (this.state === 'connecting') this.fail('Could not reach the Node.js server.');
    };
    this.socket.onclose = (event) => {
      if (!this.closedByUser && (this.state === 'running' || this.state === 'connecting'))
        this.fail(
          describeClose(event.code, event.reason, this.state === 'connecting') ||
            (this.state === 'connecting' ? 'Could not open a shell.' : ''),
        );
      this.handlers.onClose?.();
    };
  }
  get open() {
    return this.socket.readyState === WebSocket.OPEN && this.state === 'running';
  }
  write(data: string) {
    if (this.open) this.send({ type: 'input', data });
  }
  resize(cols: number, rows: number) {
    if (this.open) this.send({ type: 'resize', cols, rows });
  }
  close() {
    this.closedByUser = true;
    if (
      this.socket.readyState === WebSocket.OPEN ||
      this.socket.readyState === WebSocket.CONNECTING
    )
      this.socket.close(1000, 'closed by user');
  }
  private fail(message: string, code?: string) {
    if (this.failed) return;
    this.failed = true;
    this.state = 'error';
    if (message) this.handlers.onError?.(message, code);
  }
  private send(message: Record<string, unknown>) {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }
}
