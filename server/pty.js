import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';

// A real shell for the Terminal app: PowerShell / cmd / Git Bash on Windows, the login shell
// elsewhere, attached to a pseudo-terminal (node-pty) and bridged over a WebSocket. Interactive,
// full-screen programs such as opencode, vim, htop or `npm init` work because they see a TTY.
//
// Protocol (client → server), one JSON message per frame:
//   { type: 'start', cols, rows, shell?, token? }   open the shell (first message)
//   { type: 'input', data }                          keystrokes
//   { type: 'resize', cols, rows }
// Server → client:
//   { type: 'ready', shell, shellName, cwd, root, pid, platform, buildNumber, user, host, shells }
//   { type: 'output', data }
//   { type: 'exit', code, signal }
//   { type: 'error', message, code }                 code: disabled | unavailable | busy | token | spawn
// The shell lives exactly as long as the WebSocket: closing the tab or losing the connection
// kills the process tree, and a protocol-level heartbeat detects dead connections.
export const MAX_SESSIONS = 8;
export const HEARTBEAT_MS = 30 * 1000;
export const HIGH_WATER = 4 * 1024 * 1024;
export const LOW_WATER = 512 * 1024;

export function isEnabled(env = process.env) {
  return !['off', 'false', '0', 'no'].includes(
    String(env.WR_SHELL ?? 'on')
      .trim()
      .toLowerCase(),
  );
}
export function resolveCwd(env = process.env, home = os.homedir()) {
  return env.WR_SHELL_CWD ? path.resolve(env.WR_SHELL_CWD) : home;
}
// Discover the shells available on this host, most comfortable first. The first entry is the
// default; the terminal lets the user pick any of the others from the “+” menu.
export function detectShells(env = process.env, platform = process.platform, exists = existsSync) {
  const shells = [];
  const add = (id, name, file, args = []) => {
    if (file && !shells.some((s) => s.id === id)) shells.push({ id, name, file, args });
  };
  if (platform === 'win32') {
    const dirs = String(env.PATH || env.Path || '')
      .split(';')
      .filter(Boolean);
    const onPath = (exe) => dirs.map((d) => path.win32.join(d, exe)).find((p) => exists(p));
    const system = env.SystemRoot || env.windir || 'C:\\Windows';
    const programs = [
      env.ProgramFiles || 'C:\\Program Files',
      env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
      env.LOCALAPPDATA ? path.win32.join(env.LOCALAPPDATA, 'Programs') : null,
    ].filter(Boolean);
    const pwsh =
      onPath('pwsh.exe') ||
      programs.map((d) => path.win32.join(d, 'PowerShell', '7', 'pwsh.exe')).find((p) => exists(p));
    if (pwsh) add('pwsh', 'PowerShell 7', pwsh, ['-NoLogo']);
    const powershell = path.win32.join(
      system,
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe',
    );
    if (exists(powershell)) add('powershell', 'Windows PowerShell', powershell, ['-NoLogo']);
    const cmd = env.ComSpec || path.win32.join(system, 'System32', 'cmd.exe');
    if (exists(cmd)) add('cmd', 'Command Prompt', cmd);
    const gitBash = programs
      .map((d) => path.win32.join(d, 'Git', 'bin', 'bash.exe'))
      .find((p) => exists(p));
    if (gitBash) add('gitbash', 'Git Bash', gitBash, ['--login', '-i']);
    const wsl = path.win32.join(system, 'System32', 'wsl.exe');
    if (exists(wsl)) add('wsl', 'WSL', wsl, []);
    if (!shells.length) add('cmd', 'Command Prompt', 'cmd.exe');
  } else {
    const login = env.SHELL;
    if (login && exists(login)) add(path.basename(login), path.basename(login), login, ['-l']);
    for (const [id, file] of [
      ['zsh', '/bin/zsh'],
      ['bash', '/bin/bash'],
      ['fish', '/usr/bin/fish'],
      ['sh', '/bin/sh'],
    ])
      if (exists(file)) add(id, id, file, id === 'sh' ? [] : ['-l']);
    if (!shells.length) add('sh', 'sh', '/bin/sh');
  }
  return shells;
}
export function childEnv(base = process.env, cwd) {
  const env = {};
  for (const [key, value] of Object.entries(base)) {
    // Do not leak the parent `npm run` environment into the interactive shell.
    if (/^npm_/i.test(key) || key === 'INIT_CWD' || key === 'NODE_ENV') continue;
    env[key] = value;
  }
  env.TERM = 'xterm-256color';
  env.COLORTERM = 'truecolor';
  env.TERM_PROGRAM = 'WindowReact';
  env.TERM_PROGRAM_VERSION = '1.0.0';
  if (process.platform !== 'win32') {
    env.LANG = env.LANG || 'en_US.UTF-8';
    env.PWD = cwd;
  }
  return env;
}
export function validateSize(cols, rows) {
  const c = Number(cols);
  const r = Number(rows);
  return {
    cols: Number.isFinite(c) ? Math.min(500, Math.max(2, Math.floor(c))) : 80,
    rows: Number.isFinite(r) ? Math.min(300, Math.max(1, Math.floor(r))) : 24,
  };
}
// Browsers always send Origin on WebSocket upgrades. Accepting only same-origin connections (or a
// server-side allowlist) stops other websites from opening a shell through the user's browser.
export function originAllowed(origin, host, env = process.env) {
  if (!origin) return true; // non-browser clients such as tests and scripts
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.host === host) return true;
  const allowed = String(env.WR_SHELL_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes('*') || allowed.includes(url.origin) || allowed.includes(url.host);
}
// Optional shared secret (WR_SHELL_TOKEN) for servers reachable by other people on the network.
export function tokenAccepted(provided, env = process.env) {
  const expected = String(env.WR_SHELL_TOKEN || '');
  if (!expected) return true;
  const given = Buffer.from(String(provided ?? ''));
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
export function windowsBuildNumber(release = os.release(), platform = process.platform) {
  if (platform !== 'win32') return undefined;
  const build = Number(String(release).split('.')[2]);
  return Number.isFinite(build) ? build : undefined;
}

export async function createShellServer(server, root, { path: wsPath = '/api/shell' } = {}) {
  const enabled = isEnabled();
  const cwd = resolveCwd();
  const shells = detectShells();
  let pty = null;
  let unavailable = null;
  if (!enabled)
    unavailable = {
      code: 'disabled',
      message: 'The shell is turned off on this server (WR_SHELL=off).',
    };
  else {
    try {
      pty = await import('node-pty');
    } catch (error) {
      unavailable = {
        code: 'unavailable',
        message: `node-pty is not available on this host (${error.code || error.message}). Run “npm rebuild node-pty” and restart.`,
      };
    }
  }
  const sessions = new Set();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      pathname = '';
    }
    if (pathname !== wsPath) return; // Vite HMR keeps its own upgrade handler
    // Behind a TLS-terminating proxy the browser's Origin matches X-Forwarded-Host, not Host.
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim();
    if (!originAllowed(req.headers.origin, host)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });
  wss.on('connection', (ws) => {
    const send = (message) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
    };
    const refuse = (code, message, closeCode = 1011) => {
      send({ type: 'error', code, message });
      ws.close(closeCode, code);
    };
    if (unavailable) return refuse(unavailable.code, unavailable.message);
    let child = null;
    let paused = null;
    let alive = true;
    ws.on('pong', () => (alive = true));
    const heartbeat = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping();
    }, HEARTBEAT_MS);
    const cleanup = () => {
      clearInterval(heartbeat);
      clearInterval(paused);
      if (child) {
        sessions.delete(child);
        try {
          child.kill();
        } catch {
          /* already exited */
        }
        child = null;
      }
    };
    ws.on('message', async (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!message || typeof message !== 'object') return;
      if (message.type === 'start' && !child) {
        if (!tokenAccepted(message.token))
          return refuse('token', 'This server asks for an access token (WR_SHELL_TOKEN).', 1008);
        if (sessions.size >= MAX_SESSIONS)
          return refuse('busy', `${MAX_SESSIONS} shells are already open. Close one first.`, 1013);
        const shell = shells.find((s) => s.id === message.shell) || shells[0];
        const size = validateSize(message.cols, message.rows);
        try {
          await mkdir(cwd, { recursive: true });
          child = pty.spawn(shell.file, shell.args, {
            name: 'xterm-256color',
            cols: size.cols,
            rows: size.rows,
            cwd,
            env: childEnv(process.env, cwd),
          });
        } catch (error) {
          return refuse('spawn', `Could not start ${shell.name}: ${error.message}`);
        }
        sessions.add(child);
        const current = child;
        send({
          type: 'ready',
          shell: shell.id,
          shellName: shell.name,
          cwd,
          root,
          pid: current.pid,
          platform: process.platform,
          buildNumber: windowsBuildNumber(),
          user: os.userInfo().username,
          host: os.hostname(),
          shells: shells.map(({ id, name }) => ({ id, name })),
        });
        current.onData((data) => {
          send({ type: 'output', data });
          // Back-pressure: a runaway `yes` or `cat hugefile` must not buffer without bound.
          if (ws.bufferedAmount > HIGH_WATER && !paused) {
            current.pause();
            paused = setInterval(() => {
              if (ws.bufferedAmount < LOW_WATER || ws.readyState !== ws.OPEN) {
                clearInterval(paused);
                paused = null;
                if (child === current) current.resume();
              }
            }, 50);
          }
        });
        current.onExit(({ exitCode, signal }) => {
          if (child !== current) return;
          send({ type: 'exit', code: exitCode, signal: signal ?? null });
          sessions.delete(current);
          child = null;
          ws.close(1000, 'shell exited');
        });
      } else if (message.type === 'input' && child && typeof message.data === 'string') {
        child.write(message.data);
      } else if (message.type === 'resize' && child) {
        const size = validateSize(message.cols, message.rows);
        try {
          child.resize(size.cols, size.rows);
        } catch {
          /* the shell may be exiting */
        }
      }
    });
    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });
  return {
    enabled: !unavailable,
    reason: unavailable?.message ?? null,
    code: unavailable?.code ?? null,
    cwd,
    shells: shells.map(({ id, name }) => ({ id, name })),
    sessions: () => sessions.size,
    close: () => {
      for (const child of sessions) {
        try {
          child.kill();
        } catch {
          /* ignore */
        }
      }
      sessions.clear();
      for (const client of wss.clients) client.terminate();
      wss.close();
    },
  };
}
