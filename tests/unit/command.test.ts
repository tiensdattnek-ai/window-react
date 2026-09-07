import { describe, expect, it } from 'vitest';
import { parseCommand } from '../../src/lib/command';

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
