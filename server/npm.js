import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

// The terminal can run real `npm` / `npx` on the Node.js host. Nothing else.
// Commands are spawned directly (no shell) with npm's own CLI entry point, so
// arguments can never be interpreted by a shell and PATH quirks don't matter.
export const TIMEOUT_MS = 15 * 60 * 1000;
export const MAX_CONCURRENT = 2;
export const REQUEST_HEADER = 'WindowReact';
export const COMMANDS = ['npm', 'npx'];

export function isEnabled(env = process.env) {
  return !['off', 'false', '0', 'no'].includes(
    String(env.WR_NPM ?? 'on')
      .trim()
      .toLowerCase(),
  );
}
export function resolveCwd(root, env = process.env) {
  return path.resolve(root, env.WR_NPM_CWD || 'npm-workspace');
}
export function validateRequest(body) {
  const command = body?.command;
  const args = body?.args;
  if (!COMMANDS.includes(command)) return 'Only npm and npx can run from the terminal.';
  if (!Array.isArray(args) || args.length > 40) return 'Pass up to 40 arguments.';
  for (const arg of args) {
    if (typeof arg !== 'string' || !arg.length || arg.length > 300)
      return 'Each argument must be a short, non-empty string.';
    if (/[\u0000-\u001f\u007f]/.test(arg))
      return 'Control characters are not allowed in arguments.';
  }
  return null;
}
// npm ships next to Node.js: <node>/node_modules/npm on Windows, <node>/../lib/node_modules/npm
// elsewhere. When the server was started through `npm run dev`, npm also tells us where it lives.
export function findCli(
  command,
  env = process.env,
  execPath = process.execPath,
  exists = existsSync,
) {
  const bin = path.dirname(execPath);
  const candidates = [
    env.npm_execpath && path.join(path.dirname(env.npm_execpath), `${command}-cli.js`),
    path.join(bin, 'node_modules', 'npm', 'bin', `${command}-cli.js`),
    path.join(bin, '..', 'lib', 'node_modules', 'npm', 'bin', `${command}-cli.js`),
  ].filter(Boolean);
  return candidates.find((candidate) => exists(candidate)) || null;
}
// Drop everything the parent npm process injected (npm_*, INIT_CWD) so the child behaves like a
// fresh `npm` in its own directory, and keep output plain for a web terminal without a TTY.
export function childEnv(base = process.env) {
  const env = {};
  for (const [key, value] of Object.entries(base)) {
    if (/^npm_/i.test(key) || key === 'INIT_CWD' || key === 'NODE_ENV') continue;
    env[key] = value;
  }
  return {
    ...env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    npm_config_color: 'false',
    npm_config_progress: 'false',
    npm_config_update_notifier: 'false',
  };
}
function alive(child) {
  return child.exitCode === null && child.signalCode === null;
}
// npm starts its own children (install scripts, npx binaries). Stop the whole tree.
export function terminate(child) {
  if (!alive(child)) return;
  try {
    if (process.platform === 'win32')
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      }).on('error', () => child.kill());
    else process.kill(-child.pid, 'SIGTERM');
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
  setTimeout(() => {
    try {
      if (alive(child)) {
        if (process.platform === 'win32') child.kill('SIGKILL');
        else process.kill(-child.pid, 'SIGKILL');
      }
    } catch {
      /* already gone */
    }
  }, 4000).unref();
}

export function createNpmRunner(root) {
  const enabled = isEnabled();
  const cwd = resolveCwd(root);
  const active = new Set();
  async function handler(req, res) {
    if (!enabled)
      return res
        .status(403)
        .json({ error: 'npm commands are turned off on this server (WR_NPM=off).' });
    // A custom header forces a CORS preflight, so other websites can't drive this endpoint.
    if (req.get('x-requested-with') !== REQUEST_HEADER)
      return res
        .status(403)
        .json({ error: 'This endpoint only answers the Window React terminal.' });
    const problem = validateRequest(req.body);
    if (problem) return res.status(400).json({ error: problem });
    const { command, args } = req.body;
    const cli = findCli(command);
    if (!cli) return res.status(503).json({ error: `Could not find ${command} next to Node.js.` });
    if (active.size >= MAX_CONCURRENT)
      return res
        .status(429)
        .json({ error: `${MAX_CONCURRENT} commands are already running. Let one finish first.` });
    try {
      await mkdir(cwd, { recursive: true });
    } catch {
      return res.status(500).json({ error: `Cannot create the working folder ${cwd}.` });
    }
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const send = (event) => {
      if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
    };
    const started = Date.now();
    let child;
    try {
      child = spawn(process.execPath, [cli, ...args], {
        cwd,
        env: childEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
        windowsHide: true,
      });
    } catch (error) {
      send({ type: 'error', message: error.message });
      return res.end();
    }
    active.add(child);
    send({ type: 'start', command: [command, ...args].join(' '), cwd, pid: child.pid });
    child.stdout.on('data', (data) => send({ type: 'stdout', data: data.toString() }));
    child.stderr.on('data', (data) => send({ type: 'stderr', data: data.toString() }));
    let finished = false;
    const finish = (event) => {
      if (finished) return;
      finished = true;
      active.delete(child);
      clearTimeout(timer);
      send({ ...event, duration: Date.now() - started });
      res.end();
    };
    const timer = setTimeout(() => {
      send({ type: 'stderr', data: `\nStopped: ${command} ran longer than 15 minutes.\n` });
      terminate(child);
    }, TIMEOUT_MS);
    child.on('error', (error) =>
      finish({
        type: 'error',
        message: error.code === 'ENOENT' ? 'Node.js could not start npm.' : error.message,
      }),
    );
    child.on('close', (code, signal) => finish({ type: 'exit', code, signal }));
    // The terminal was closed or the user pressed Ctrl+C: stop the process too.
    res.on('close', () => {
      if (!finished) terminate(child);
    });
  }
  return {
    enabled,
    cwd,
    handler,
    running: () => active.size,
    stopAll: () => active.forEach(terminate),
  };
}
