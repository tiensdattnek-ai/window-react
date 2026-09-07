// Shell-style tokenizer for the in-browser workspace shell.
export interface ParsedCommand {
  command: string;
  args: string[];
}
// Quotes group words and are removed, everything else splits on
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
