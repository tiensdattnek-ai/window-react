import { describe, expect, it } from 'vitest';
import { createEventParser, parseCommand, runNpm } from '../../src/lib/npm';
import type { NpmEvent } from '../../src/lib/npm';
import { childEnv, findCli, isEnabled, validateRequest } from '../../server/npm.js';

describe('terminal command parser', () => {
  it('splits npm commands into arguments', () =>
    expect(parseCommand('npm i -g opencode-ai')).toEqual({
      command: 'npm',
      args: ['i', '-g', 'opencode-ai'],
    }));
  it('keeps quoted arguments together and removes the quotes', () =>
    expect(parseCommand(`mkdir "My project"  'another one'`)).toEqual({
      command: 'mkdir',
      args: ['My project', 'another one'],
    }));
  it('supports empty quoted strings and mixed quoting', () =>
    expect(parseCommand(`npm pkg set description="" name='window react'`)).toEqual({
      command: 'npm',
      args: ['pkg', 'set', 'description=', 'name=window react'],
    }));
  it('treats a redirect as its own token', () =>
    expect(parseCommand('echo "Hello, Window React!" > hello.txt').args).toEqual([
      'Hello, Window React!',
      '>',
      'hello.txt',
    ]));
  it('returns an empty command for blank input', () =>
    expect(parseCommand('   ')).toEqual({ command: '', args: [] }));
});

describe('npm event stream parser', () => {
  it('reassembles events that arrive split across chunks', () => {
    const events: NpmEvent[] = [];
    const parser = createEventParser((event) => events.push(event));
    parser.push('{"type":"start","command":"npm -v","cwd":"/tmp","pid":1}\n{"type":"std');
    parser.push('out","data":"10.9.8\\n"}\n');
    parser.push('{"type":"exit","code":0,"signal":null,"duration":5}');
    parser.end();
    expect(events.map((e) => e.type)).toEqual(['start', 'stdout', 'exit']);
    expect(events[1]).toEqual({ type: 'stdout', data: '10.9.8\n' });
  });
  it('surfaces unparsable lines as plain output instead of throwing', () => {
    const events: NpmEvent[] = [];
    const parser = createEventParser((event) => events.push(event));
    parser.push('not json\n');
    expect(events).toEqual([{ type: 'stdout', data: 'not json\n' }]);
  });
});

describe('runNpm', () => {
  const stream = (lines: string[]) =>
    new Response(new Blob([lines.join('\n') + '\n']).stream(), { status: 200 });
  it('streams output and resolves with the exit code', async () => {
    const output: string[] = [];
    let started = '';
    const result = await runNpm('npm', ['i', '-g', 'opencode-ai'], {
      fetcher: async (_url, init) => {
        expect(JSON.parse(String(init?.body))).toEqual({
          command: 'npm',
          args: ['i', '-g', 'opencode-ai'],
        });
        expect(new Headers(init?.headers).get('x-requested-with')).toBe('WindowReact');
        return stream([
          JSON.stringify({ type: 'start', command: 'npm i -g opencode-ai', cwd: '/tmp', pid: 7 }),
          JSON.stringify({ type: 'stdout', data: 'added 3 packages\n' }),
          JSON.stringify({ type: 'exit', code: 0, signal: null, duration: 12 }),
        ]);
      },
      onStart: (info) => (started = info.command),
      onOutput: (text) => output.push(text),
    });
    expect(started).toBe('npm i -g opencode-ai');
    expect(output).toEqual(['added 3 packages\n']);
    expect(result).toEqual({ code: 0, signal: null, duration: 12 });
  });
  it('turns server refusals into readable errors', async () => {
    await expect(
      runNpm('npm', ['-v'], {
        fetcher: async () =>
          Response.json({ error: 'npm commands are turned off.' }, { status: 403 }),
      }),
    ).rejects.toThrow('npm commands are turned off.');
  });
  it('fails when the stream ends without an exit event', async () => {
    await expect(
      runNpm('npx', ['cowsay'], {
        fetcher: async () =>
          stream([JSON.stringify({ type: 'start', command: 'npx cowsay', cwd: '/tmp', pid: 1 })]),
      }),
    ).rejects.toThrow(/interrupted/);
  });
});

describe('server-side npm guard rails', () => {
  it('accepts only npm and npx with sane arguments', () => {
    expect(validateRequest({ command: 'npm', args: ['i', '-g', 'opencode-ai'] })).toBeNull();
    expect(validateRequest({ command: 'npx', args: ['cowsay', 'hi'] })).toBeNull();
    expect(validateRequest({ command: 'node', args: ['-e', '1'] })).toMatch(/Only npm and npx/);
    expect(validateRequest({ command: 'npm', args: 'i -g x' })).toMatch(/arguments/);
    expect(validateRequest({ command: 'npm', args: [''] })).toMatch(/non-empty/);
    expect(validateRequest({ command: 'npm', args: ['a\u0000b'] })).toMatch(/Control characters/);
    expect(validateRequest({ command: 'npm', args: Array(41).fill('x') })).toMatch(/40/);
    expect(validateRequest(null)).toMatch(/Only npm and npx/);
  });
  it('can be switched off with WR_NPM', () => {
    expect(isEnabled({})).toBe(true);
    expect(isEnabled({ WR_NPM: 'on' })).toBe(true);
    expect(isEnabled({ WR_NPM: 'off' })).toBe(false);
    expect(isEnabled({ WR_NPM: '0' })).toBe(false);
  });
  it('locates npm next to the running Node.js binary', () => {
    const exists = (candidate: string) =>
      candidate.endsWith('/lib/node_modules/npm/bin/npm-cli.js');
    expect(findCli('npm', {}, '/usr/local/bin/node', exists)).toBe(
      '/usr/local/lib/node_modules/npm/bin/npm-cli.js',
    );
    expect(
      findCli('npx', { npm_execpath: '/opt/npm/bin/npm-cli.js' }, '/usr/local/bin/node', (c) =>
        c.startsWith('/opt/npm/'),
      ),
    ).toBe('/opt/npm/bin/npx-cli.js');
    expect(findCli('npm', {}, '/nowhere/node', () => false)).toBeNull();
  });
  it('strips the parent npm environment and disables colour', () => {
    const env = childEnv({
      PATH: '/usr/bin',
      npm_config_local_prefix: '/repo',
      npm_lifecycle_event: 'dev',
      INIT_CWD: '/repo',
      NODE_ENV: 'production',
    });
    expect(env.PATH).toBe('/usr/bin');
    expect(env).not.toHaveProperty('npm_config_local_prefix');
    expect(env).not.toHaveProperty('npm_lifecycle_event');
    expect(env).not.toHaveProperty('INIT_CWD');
    expect(env).not.toHaveProperty('NODE_ENV');
    expect(env.npm_config_color).toBe('false');
    expect(env.NO_COLOR).toBe('1');
  });
});
