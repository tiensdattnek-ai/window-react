import { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { WindowLogo } from '../components/AppIcon';
import { APPS, WALLPAPERS } from '../lib/data';
import { calculate } from '../lib/calculator';
import { parseCommand } from '../lib/command';
import { formatBytes } from '../lib/utils';
import type { AppId } from '../lib/types';

interface Output {
  id: number;
  type: 'input' | 'output' | 'error' | 'muted';
  text: string;
  path?: string;
}
export interface ShellApi {
  paste: (text: string) => void;
  clear: () => void;
}
const COMMANDS = [
  'help',
  'ls',
  'cd',
  'pwd',
  'cat',
  'mkdir',
  'touch',
  'echo',
  'rm',
  'open',
  'calc',
  'theme',
  'wallpaper',
  'sysinfo',
  'neofetch',
  'date',
  'whoami',
  'history',
  'clear',
];
// The original in-browser shell: it only touches the virtual workspace files, so it is always
// safe, works offline and needs no server. Available as a tab next to the real shell.
export function WorkspaceShell({
  visible,
  register,
}: {
  visible: boolean;
  register: (api: ShellApi) => void;
}) {
  const { files, createFile, updateFile, trashFile, openApp, prefs, updatePrefs } = useWorkspace();
  const [lines, setLines] = useState<Output[]>([]);
  const [command, setCommand] = useState('');
  const [cwd, setCwd] = useState('root');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const counter = useRef(0);
  useEffect(() => {
    scroll.current?.scrollTo(0, scroll.current.scrollHeight);
  }, [lines, busy]);
  useEffect(() => {
    if (visible) requestAnimationFrame(() => input.current?.focus());
  }, [visible]);
  useEffect(() => {
    register({
      paste: (text) => {
        setCommand(text.replace(/\r?\n?$/, '').replace(/\r/g, ''));
        input.current?.focus();
      },
      clear: () => setLines([]),
    });
  }, [register]);
  function pathString(id: string): string {
    if (id === 'root') return '~';
    const file = files.find((f) => f.id === id && !f.trashed);
    return file ? `${pathString(file.parentId)}/${file.name}` : '~';
  }
  function resolve(path: string) {
    if (!path || path === '~' || path === '/') return 'root';
    let current = path.startsWith('/') || path.startsWith('~') ? 'root' : cwd;
    for (const part of path.replace(/^~\/?/, '').split('/').filter(Boolean)) {
      if (part === '.') continue;
      if (part === '..') {
        current = files.find((f) => f.id === current)?.parentId || 'root';
        continue;
      }
      const item = files.find(
        (f) => f.parentId === current && !f.trashed && f.name.toLowerCase() === part.toLowerCase(),
      );
      if (!item) return null;
      current = item.id;
    }
    return current;
  }
  function append(text: string, type: Output['type'] = 'output') {
    setLines((items) => [...items.slice(-300), { id: ++counter.current, type, text }]);
  }
  async function execute() {
    const raw = command.trim();
    if (!raw || busy) return;
    setLines((items) => [
      ...items,
      { id: ++counter.current, type: 'input', text: raw, path: pathString(cwd) },
    ]);
    setHistory((items) => [...items, raw]);
    setHistoryIndex(-1);
    setCommand('');
    const parsed = parseCommand(raw);
    const parts = [...parsed.args];
    const cmd = parsed.command.toLowerCase();
    const argument = parts.join(' ');
    try {
      switch (cmd) {
        case 'help':
          append(
            'A FEW THINGS YOU CAN DO\n\n  help                 A little guidance\n  ls [folder]          See what’s here\n  cd <folder>          Go somewhere\n  pwd                  Know where you are\n  cat <file>           Read a little something\n  mkdir <name>         Make some room\n  touch <name>         A fresh, empty file\n  echo <text>          Say something (or > file.txt)\n  rm <file>            Move to Recycle Bin\n  open <app>           Open an app\n  calc <expression>    A little arithmetic\n  theme light|dark     Set the mood\n  wallpaper <name>     serenity · dusk · bloom\n  sysinfo              Check in with Node.js\n  neofetch             Meet your workspace\n  date · whoami        Here and now\n  history · clear      Look back. Or start fresh.\n\nNeed a real shell? Open a new tab with + to run npm, node, git or opencode on the host.\n\nTip: use quotes around file names with spaces. ↑ ↓ for history.',
          );
          break;
        case 'clear':
          setLines([]);
          break;
        case 'pwd':
          append(pathString(cwd).replace('~', '/workspace'));
          break;
        case 'ls': {
          const id = argument ? resolve(argument) : cwd;
          if (!id) throw new Error(`No such folder: ${argument}`);
          const children = files.filter((f) => f.parentId === id && !f.trashed);
          append(
            children.length
              ? children
                  .map(
                    (f) =>
                      `${f.kind === 'folder' ? 'dir ' : 'file'}  ${f.name.padEnd(38)} ${f.kind === 'folder' ? '—' : formatBytes(f.size)}`,
                  )
                  .join('\n')
              : 'Nothing here yet. A little room for possibility.',
          );
          break;
        }
        case 'cd': {
          const id = resolve(argument);
          if (!id || (id !== 'root' && files.find((f) => f.id === id)?.kind !== 'folder'))
            throw new Error(`No such folder: ${argument}`);
          setCwd(id);
          break;
        }
        case 'cat': {
          const item = files.find((f) => f.id === resolve(argument));
          if (!item || !['text', 'code'].includes(item.kind))
            throw new Error('Choose an existing text or code file.');
          append(item.content || '(empty file)');
          break;
        }
        case 'mkdir':
        case 'touch': {
          if (!argument) throw new Error(`Usage: ${cmd} <name>`);
          const id = createFile(argument, cmd === 'mkdir' ? 'folder' : 'text', cwd);
          if (!id) throw new Error('Could not create this item. Check the name.');
          append(`Created ${argument}`);
          break;
        }
        case 'rm': {
          const id = resolve(argument);
          if (!argument || !id || id === 'root')
            throw new Error('Choose an existing file or folder.');
          if (['documents', 'pictures', 'music-folder', 'downloads'].includes(id))
            throw new Error('Default collection folders are protected.');
          trashFile(id);
          if (id === cwd) setCwd('root');
          append('Moved to Recycle Bin. Restore it in File Explorer.');
          break;
        }
        case 'echo': {
          const redirect = parts.indexOf('>');
          if (redirect >= 0) {
            const text = parts.slice(0, redirect).join(' ');
            const name = parts.slice(redirect + 1).join(' ');
            if (!name) throw new Error('Add a file name after >');
            const existing = files.find((f) => f.id === resolve(name));
            if (existing) {
              if (!['text', 'code'].includes(existing.kind))
                throw new Error('Only text files can be edited.');
              updateFile(existing.id, { content: text });
            } else if (!createFile(name, 'text', cwd, text)) throw new Error('Invalid file name.');
            append(`Saved to ${name}`);
          } else append(argument);
          break;
        }
        case 'open': {
          const app = APPS.find(
            (a) =>
              a.id === argument.toLowerCase() || a.name.toLowerCase() === argument.toLowerCase(),
          );
          if (app) {
            openApp(app.id as AppId);
            append(`Opening ${app.name}…`);
          } else {
            const file = files.find((f) => f.id === resolve(argument));
            if (file) {
              if (file.kind === 'folder') openApp('explorer', file.id);
              else
                openApp(
                  file.kind === 'image' ? 'photos' : file.kind === 'audio' ? 'music' : 'notes',
                  file.id,
                );
            } else throw new Error(`Try: ${APPS.map((a) => a.id).join(', ')}`);
          }
          break;
        }
        case 'calc':
          append(`${calculate(argument)}`);
          break;
        case 'date':
          append(new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' }));
          break;
        case 'whoami':
          append(`${prefs.name}\nA curious human, making a little space.`);
          break;
        case 'history':
          append([...history, raw].map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join('\n'));
          break;
        case 'theme':
          if (!['light', 'dark'].includes(argument)) throw new Error('Usage: theme light | dark');
          updatePrefs({ theme: argument as 'light' | 'dark' });
          append(`A ${argument === 'dark' ? 'quieter' : 'brighter'} perspective.`);
          break;
        case 'wallpaper': {
          const wallpaper = WALLPAPERS.find((w) => w.id === argument);
          if (!wallpaper) throw new Error('Choose serenity, dusk, or bloom.');
          updatePrefs({ wallpaper: wallpaper.url });
          append(`Set the scene: ${wallpaper.name}.`);
          break;
        }
        case 'neofetch':
          append(
            `  ▦  WINDOW REACT\n\n  OS        Window React 1.0\n  Host      Your browser\n  Shell     Workspace Shell\n  Stack     React + TypeScript + Node.js\n  Theme     ${prefs.theme}\n  Files     ${files.filter((f) => !f.trashed).length}\n  Storage   Local-first, always\n\n  Thoughtfully made. Open by nature.`,
          );
          break;
        case 'sysinfo': {
          setBusy(true);
          const res = await fetch('/api/system');
          if (!res.ok) throw new Error('Node.js is unavailable.');
          const info = await res.json();
          append(
            `NODE.JS SERVER\n\n  Runtime     ${info.runtime}\n  Platform    ${info.platform} / ${info.architecture}\n  Memory      ${formatBytes(info.memory.used)} (process)\n  CPUs        ${info.cpus}\n  Uptime      ${info.uptime}s\n  Mode        ${info.mode}\n  Shell       ${info.shell?.enabled ? `real shell available${info.shell.cwd ? ` · ${info.shell.cwd}` : ''}` : 'virtual only'}\n\nThis describes the Node.js host, not your physical device.`,
          );
          break;
        }
        default:
          throw new Error(`“${cmd}” is not a workspace command. Type help to see what’s possible.`);
      }
    } catch (error) {
      append(error instanceof Error ? error.message : 'Something didn’t go as planned.', 'error');
    } finally {
      setBusy(false);
      requestAnimationFrame(() => input.current?.focus());
    }
  }
  return (
    <div className="workspace-shell">
      <div
        className="terminal-scroll"
        ref={scroll}
        onClick={() => {
          if (!window.getSelection()?.toString()) input.current?.focus();
        }}
      >
        <div className="terminal-welcome">
          <WindowLogo size={49} />
          <div>
            <h2>A window of possibility.</h2>
            <p>
              Window React Terminal <span>v1.0.0</span>
            </p>
          </div>
        </div>
        <p className="terminal-hint">
          Your space, one command away. Type <strong>help</strong> to get started.
        </p>
        {lines.map((line) => (
          <div key={line.id} className={`terminal-line ${line.type}`}>
            {line.type === 'input' && (
              <span className="terminal-prompt">
                {line.path} <b>❯</b>{' '}
              </span>
            )}
            <span>{line.text}</span>
          </div>
        ))}
        <form
          className="terminal-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            void execute();
          }}
        >
          <span className="terminal-prompt">
            {pathString(cwd)} <b>❯</b>
          </span>
          <input
            ref={input}
            value={command}
            readOnly={busy}
            aria-label="Terminal command"
            placeholder={busy ? 'One moment…' : ''}
            onChange={(e) => setCommand(e.target.value)}
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (busy) return;
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                const index = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
                setHistoryIndex(index);
                setCommand(history[index] || '');
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const index = historyIndex + 1;
                if (index >= history.length) {
                  setHistoryIndex(-1);
                  setCommand('');
                } else {
                  setHistoryIndex(index);
                  setCommand(history[index] || '');
                }
              }
              if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                setLines([]);
              }
              if (e.ctrlKey && e.key === 'c') {
                if (!window.getSelection()?.toString()) {
                  e.preventDefault();
                  setCommand('');
                  append('^C');
                }
              }
              if (e.key === 'Tab') {
                e.preventDefault();
                const matches = COMMANDS.filter((c) => c.startsWith(command));
                if (matches.length === 1) setCommand(matches[0] + ' ');
              }
            }}
          />
        </form>
      </div>
    </div>
  );
}
