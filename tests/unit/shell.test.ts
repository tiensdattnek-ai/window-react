import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShellSession, describeClose, parseMessage, shellUrl } from '../../src/lib/shell';
import {
  childEnv,
  detectShells,
  isEnabled,
  originAllowed,
  resolveCwd,
  tokenAccepted,
  validateSize,
  windowsBuildNumber,
} from '../../server/pty.js';

class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  closed: { code?: number; reason?: string } | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number, reason?: string) {
    this.closed = { code, reason };
    this.readyState = 3;
    this.onclose?.({ code: code ?? 1005, reason: reason ?? '' });
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

describe('shell client protocol', () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', { OPEN: 1, CONNECTING: 0 });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('builds ws / wss URLs from the page origin', () => {
    expect(shellUrl({ protocol: 'http:', host: 'localhost:3000' })).toBe(
      'ws://localhost:3000/api/shell',
    );
    expect(shellUrl({ protocol: 'https:', host: 'desk.example.com' })).toBe(
      'wss://desk.example.com/api/shell',
    );
  });
  it('ignores malformed frames', () => {
    expect(parseMessage('not json')).toBeNull();
    expect(parseMessage(new ArrayBuffer(2))).toBeNull();
    expect(parseMessage('{"nope":1}')).toBeNull();
    expect(parseMessage('{"type":"output","data":"hi"}')).toEqual({ type: 'output', data: 'hi' });
  });
  it('describes close codes in plain words', () => {
    expect(describeClose(1000, 'shell exited')).toBe('');
    expect(describeClose(1006, '')).toMatch(/lost/);
    expect(describeClose(1013, 'busy')).toBe('busy');
    expect(describeClose(1011, '')).toMatch(/1011/);
  });
  it('starts the shell with the grid size, forwards input, resize and output', () => {
    const output: string[] = [];
    let ready = null as unknown;
    const session = new ShellSession({
      cols: 120,
      rows: 40,
      shell: 'pwsh',
      token: 'secret',
      url: 'ws://test/api/shell',
      factory: (url) => new FakeSocket(url) as unknown as WebSocket,
      onReady: (info) => (ready = info),
      onOutput: (data) => output.push(data),
    });
    const socket = FakeSocket.instances[0];
    expect(socket.url).toBe('ws://test/api/shell');
    socket.open();
    expect(JSON.parse(socket.sent[0])).toEqual({
      type: 'start',
      cols: 120,
      rows: 40,
      shell: 'pwsh',
      token: 'secret',
    });
    // Nothing is typed into a shell that is not ready yet.
    session.write('early');
    expect(socket.sent).toHaveLength(1);
    socket.receive({
      type: 'ready',
      shell: 'pwsh',
      shellName: 'PowerShell 7',
      cwd: 'C:\\Users\\me',
      pid: 42,
      platform: 'win32',
      user: 'me',
      host: 'PC',
      shells: [],
    });
    expect(session.state).toBe('running');
    expect((ready as { shellName: string }).shellName).toBe('PowerShell 7');
    session.write('opencode\r');
    session.resize(100, 30);
    expect(JSON.parse(socket.sent[1])).toEqual({ type: 'input', data: 'opencode\r' });
    expect(JSON.parse(socket.sent[2])).toEqual({ type: 'resize', cols: 100, rows: 30 });
    socket.receive({ type: 'output', data: 'PS C:\\Users\\me> ' });
    expect(output).toEqual(['PS C:\\Users\\me> ']);
  });
  it('reports exit, errors and dropped connections once', () => {
    const events: string[] = [];
    const make = () =>
      new ShellSession({
        cols: 80,
        rows: 24,
        factory: (url) => new FakeSocket(url) as unknown as WebSocket,
        url: 'ws://test/api/shell',
        onExit: (code) => events.push(`exit:${code}`),
        onError: (message, code) => events.push(`error:${code ?? ''}:${message}`),
        onClose: () => events.push('close'),
      });
    const exiting = make();
    let socket = FakeSocket.instances[0];
    socket.open();
    socket.receive({
      type: 'ready',
      shell: 'bash',
      shellName: 'bash',
      cwd: '/',
      pid: 1,
      platform: 'linux',
      user: 'u',
      host: 'h',
      shells: [],
    });
    socket.receive({ type: 'exit', code: 130, signal: null });
    socket.close(1000, 'shell exited');
    expect(exiting.state).toBe('exited');
    expect(events).toEqual(['exit:130', 'close']);

    events.length = 0;
    const refused = make();
    socket = FakeSocket.instances[1];
    socket.open();
    socket.receive({ type: 'error', code: 'token', message: 'Token required.' });
    socket.close(1008, 'token');
    expect(refused.state).toBe('error');
    expect(events).toEqual(['error:token:Token required.', 'close']);

    events.length = 0;
    const dropped = make();
    socket = FakeSocket.instances[2];
    socket.open();
    socket.receive({
      type: 'ready',
      shell: 'bash',
      shellName: 'bash',
      cwd: '/',
      pid: 1,
      platform: 'linux',
      user: 'u',
      host: 'h',
      shells: [],
    });
    socket.onclose?.({ code: 1006, reason: '' });
    expect(dropped.state).toBe('error');
    expect(events[0]).toMatch(/^error::.*lost/);

    events.length = 0;
    const byUser = make();
    socket = FakeSocket.instances[3];
    socket.open();
    socket.receive({
      type: 'ready',
      shell: 'bash',
      shellName: 'bash',
      cwd: '/',
      pid: 1,
      platform: 'linux',
      user: 'u',
      host: 'h',
      shells: [],
    });
    byUser.close();
    expect(socket.closed).toEqual({ code: 1000, reason: 'closed by user' });
    expect(events).toEqual(['close']);
  });
});

describe('server-side shell guard rails', () => {
  it('can be switched off and points at a configurable folder', () => {
    expect(isEnabled({})).toBe(true);
    expect(isEnabled({ WR_SHELL: 'off' })).toBe(false);
    expect(resolveCwd({}, '/home/me')).toBe('/home/me');
    expect(resolveCwd({ WR_SHELL_CWD: '/srv/work' }, '/home/me')).toBe('/srv/work');
  });
  it('clamps terminal sizes', () => {
    expect(validateSize('120', '40')).toEqual({ cols: 120, rows: 40 });
    expect(validateSize(99999, -3)).toEqual({ cols: 500, rows: 1 });
    expect(validateSize('x', undefined)).toEqual({ cols: 80, rows: 24 });
  });
  it('accepts same-origin and allow-listed origins only', () => {
    expect(originAllowed(undefined, 'localhost:3000')).toBe(true);
    expect(originAllowed('http://localhost:3000', 'localhost:3000')).toBe(true);
    expect(originAllowed('https://evil.example', 'localhost:3000')).toBe(false);
    expect(originAllowed('garbage', 'localhost:3000')).toBe(false);
    expect(
      originAllowed('https://desk.example.com', 'localhost:3000', {
        WR_SHELL_ORIGINS: 'https://desk.example.com',
      }),
    ).toBe(true);
    expect(originAllowed('https://x.y', 'localhost:3000', { WR_SHELL_ORIGINS: '*' })).toBe(true);
  });
  it('checks the optional access token in constant time', () => {
    expect(tokenAccepted(undefined, {})).toBe(true);
    expect(tokenAccepted('abc', { WR_SHELL_TOKEN: 'abc' })).toBe(true);
    expect(tokenAccepted('abd', { WR_SHELL_TOKEN: 'abc' })).toBe(false);
    expect(tokenAccepted(undefined, { WR_SHELL_TOKEN: 'abc' })).toBe(false);
    expect(tokenAccepted('abcd', { WR_SHELL_TOKEN: 'abc' })).toBe(false);
  });
  it('prefers PowerShell 7, then Windows PowerShell, cmd, Git Bash and WSL on Windows', () => {
    const present = new Set([
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'C:\\Windows\\System32\\cmd.exe',
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Windows\\System32\\wsl.exe',
    ]);
    const shells = detectShells(
      {
        PATH: 'C:\\Windows\\System32',
        SystemRoot: 'C:\\Windows',
        ProgramFiles: 'C:\\Program Files',
      },
      'win32',
      (file) => present.has(file),
    );
    expect(shells.map((s) => s.id)).toEqual(['pwsh', 'powershell', 'cmd', 'gitbash', 'wsl']);
    expect(shells[0].args).toEqual(['-NoLogo']);
  });
  it('falls back to cmd.exe when nothing else is found on Windows', () => {
    expect(detectShells({}, 'win32', () => false).map((s) => s.id)).toEqual(['cmd']);
  });
  it('uses the login shell first on Unix', () => {
    const shells = detectShells({ SHELL: '/usr/bin/fish' }, 'linux', (file) =>
      ['/usr/bin/fish', '/bin/bash', '/bin/sh'].includes(file),
    );
    expect(shells.map((s) => s.id)).toEqual(['fish', 'bash', 'sh']);
    expect(shells[0].args).toEqual(['-l']);
    expect(shells[2].args).toEqual([]);
  });
  it('gives the shell a truecolor terminal and drops the parent npm environment', () => {
    const env = childEnv(
      { PATH: '/bin', npm_config_prefix: '/x', INIT_CWD: '/y', NODE_ENV: 'production' },
      '/home/me',
    );
    expect(env.TERM).toBe('xterm-256color');
    expect(env.COLORTERM).toBe('truecolor');
    expect(env.PATH).toBe('/bin');
    expect(env).not.toHaveProperty('npm_config_prefix');
    expect(env).not.toHaveProperty('INIT_CWD');
    expect(env).not.toHaveProperty('NODE_ENV');
  });
  it('extracts the Windows build number for ConPTY hints', () => {
    expect(windowsBuildNumber('10.0.22631', 'win32')).toBe(22631);
    expect(windowsBuildNumber('6.5.0-generic', 'linux')).toBeUndefined();
  });
});
