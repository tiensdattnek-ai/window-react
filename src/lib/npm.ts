// Client side of the terminal's npm / npx support. The Node.js server spawns the real npm CLI
// and streams its output back as newline-delimited JSON events (see server/npm.js).
export const NPM_COMMANDS = ['npm', 'npx'] as const;
export type NpmCommand = (typeof NPM_COMMANDS)[number];

export interface ParsedCommand {
  command: string;
  args: string[];
}
// Shell-style tokenizer: quotes group words and are removed, everything else splits on
// whitespace. `npm i -g opencode-ai` → ['npm', 'i', '-g', 'opencode-ai'].
export function parseCommand(raw: string): ParsedCommand {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let hasToken = false;
  for (const char of raw.trim()) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      hasToken = true;
    } else if (/\s/.test(char)) {
      if (hasToken) tokens.push(current);
      current = '';
      hasToken = false;
    } else {
      current += char;
      hasToken = true;
    }
  }
  if (hasToken) tokens.push(current);
  const [command = '', ...args] = tokens;
  return { command, args };
}

export type NpmEvent =
  | { type: 'start'; command: string; cwd: string; pid: number }
  | { type: 'stdout'; data: string }
  | { type: 'stderr'; data: string }
  | { type: 'exit'; code: number | null; signal: string | null; duration: number }
  | { type: 'error'; message: string; duration?: number };

export interface NpmResult {
  code: number | null;
  signal: string | null;
  duration: number;
}
export interface RunOptions {
  signal?: AbortSignal;
  onStart?: (info: { command: string; cwd: string }) => void;
  onOutput?: (text: string, stream: 'output' | 'error') => void;
  fetcher?: typeof fetch;
}
// Parses an NDJSON body chunk by chunk. Exposed so the parser can be unit tested.
export function createEventParser(onEvent: (event: NpmEvent) => void) {
  let buffer = '';
  const consume = (line: string) => {
    if (!line.trim()) return;
    try {
      onEvent(JSON.parse(line) as NpmEvent);
    } catch {
      onEvent({ type: 'stdout', data: `${line}\n` });
    }
  };
  return {
    push(chunk: string) {
      buffer += chunk;
      let index = buffer.indexOf('\n');
      while (index >= 0) {
        consume(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
        index = buffer.indexOf('\n');
      }
    },
    end() {
      if (buffer) consume(buffer);
      buffer = '';
    },
  };
}
export async function runNpm(
  command: NpmCommand,
  args: string[],
  { signal, onStart, onOutput, fetcher = fetch }: RunOptions = {},
): Promise<NpmResult> {
  const response = await fetcher('/api/npm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'WindowReact' },
    body: JSON.stringify({ command, args }),
    signal,
  });
  if (!response.ok) {
    let message = `The Node.js server answered ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  if (!response.body) throw new Error('The Node.js server sent no output stream.');
  let result: NpmResult | null = null;
  let failure: string | null = null;
  const parser = createEventParser((event) => {
    if (event.type === 'start') onStart?.({ command: event.command, cwd: event.cwd });
    else if (event.type === 'stdout') onOutput?.(event.data, 'output');
    else if (event.type === 'stderr') onOutput?.(event.data, 'error');
    else if (event.type === 'exit')
      result = { code: event.code, signal: event.signal, duration: event.duration };
    else if (event.type === 'error') failure = event.message;
  });
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.push(value);
  }
  parser.end();
  if (failure) throw new Error(failure);
  if (!result) throw new Error('The connection to the Node.js server was interrupted.');
  return result;
}
