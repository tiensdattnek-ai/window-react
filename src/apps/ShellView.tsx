import { useEffect, useRef, useState } from 'react';
import { Terminal as Xterm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { WebglAddon } from '@xterm/addon-webgl';
import { ArrowDown, ArrowUp, CaseSensitive, Regex, X } from 'lucide-react';
import { ShellSession } from '../lib/shell';
import type { ShellInfo, ShellState } from '../lib/shell';
import type { ShellApi } from './WorkspaceShell';
import '@xterm/xterm/css/xterm.css';

export interface ShellTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  accent: string;
}
export type ShellEvent = ShellState | 'restart' | 'search';
export interface ShellViewProps {
  /** Which shell to start (an id from /api/system → shell.shells). Empty = server default. */
  shell?: string;
  /** Optional WR_SHELL_TOKEN value for protected servers. */
  token?: string;
  /** Bump to restart the session in place. */
  generation: number;
  theme: ShellTheme;
  fontSize: number;
  animations: boolean;
  /** Whether this tab is the visible one; hidden tabs skip fitting and focusing. */
  visible: boolean;
  /** Show the find bar. */
  search: boolean;
  onCloseSearch: () => void;
  /** Exposes paste/clear so the tab bar's quick actions can drive this terminal. */
  register: (api: ShellApi) => void;
  onState: (state: ShellEvent, detail?: string) => void;
  onReady: (info: ShellInfo) => void;
  onTitle: (title: string) => void;
  onBell?: () => void;
}
const ESC = '\x1b';
const dim = (text: string) => `${ESC}[2m${text}${ESC}[0m`;
const bold = (text: string) => `${ESC}[1m${text}${ESC}[0m`;
const red = (text: string) => `${ESC}[38;2;223;171;147m${text}${ESC}[0m`;
// Printable ANSI palette that sits well on the app's forest-green surface.
const PALETTE = {
  black: '#1c2b25',
  red: '#e3927b',
  green: '#9ccb83',
  yellow: '#e2c47e',
  blue: '#86b4e0',
  magenta: '#c9a2e3',
  cyan: '#84cbc5',
  white: '#d8e3d2',
  brightBlack: '#6f8767',
  brightRed: '#f0a893',
  brightGreen: '#b3de9c',
  brightYellow: '#f0d69a',
  brightBlue: '#a2c8ef',
  brightMagenta: '#dbb9f0',
  brightCyan: '#a0ded9',
  brightWhite: '#eef5ea',
};
export function ShellView({
  shell,
  token,
  generation,
  theme,
  fontSize,
  animations,
  visible,
  search,
  onCloseSearch,
  register,
  onState,
  onReady,
  onTitle,
  onBell,
}: ShellViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const term = useRef<Xterm | null>(null);
  const fit = useRef<FitAddon | null>(null);
  const searcher = useRef<SearchAddon | null>(null);
  const session = useRef<ShellSession | null>(null);
  const callbacks = useRef({ onState, onReady, onTitle, onBell });
  callbacks.current = { onState, onReady, onTitle, onBell };
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [results, setResults] = useState<{ index: number; count: number } | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  // Create the xterm instance once per mount.
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const xterm = new Xterm({
      allowProposedApi: true,
      cursorBlink: animations,
      cursorStyle: 'bar',
      cursorWidth: 2,
      fontFamily:
        "'JetBrains Mono Variable', 'Cascadia Code', 'Fira Code', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
      fontSize,
      fontWeight: '400',
      fontWeightBold: '600',
      lineHeight: 1.25,
      letterSpacing: 0,
      scrollback: 10000,
      smoothScrollDuration: animations ? 80 : 0,
      macOptionIsMeta: true,
      rightClickSelectsWord: false,
      minimumContrastRatio: 1,
      drawBoldTextInBrightColors: true,
      theme: {
        background: theme.background,
        foreground: theme.foreground,
        cursor: theme.cursor,
        cursorAccent: theme.background,
        selectionBackground: theme.selection,
        selectionInactiveBackground: theme.selection,
        ...PALETTE,
      },
    });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const unicode = new Unicode11Addon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(searchAddon);
    xterm.loadAddon(unicode);
    xterm.loadAddon(new ClipboardAddon());
    xterm.loadAddon(
      new WebLinksAddon((event, uri) => {
        if (event.ctrlKey || event.metaKey || event.type === 'click')
          window.open(uri, '_blank', 'noopener,noreferrer');
      }),
    );
    xterm.unicode.activeVersion = '11';
    xterm.open(element);
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      xterm.loadAddon(webgl);
    } catch {
      /* fall back to the DOM renderer (no WebGL, e.g. remote desktop) */
    }
    // Familiar desktop shortcuts on top of the raw terminal keys:
    // Ctrl+Shift+C / Ctrl+Shift+V copy & paste, Ctrl+C with a selection copies instead of SIGINT,
    // Ctrl+Shift+F opens find. Everything else goes to the shell (so Ctrl+C, Ctrl+D, Ctrl+R work).
    xterm.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const key = event.key.toLowerCase();
      const primary = event.ctrlKey || event.metaKey;
      if (primary && event.shiftKey && key === 'c') {
        if (xterm.hasSelection()) void navigator.clipboard?.writeText(xterm.getSelection());
        return false;
      }
      if (primary && event.shiftKey && key === 'v') {
        void navigator.clipboard?.readText().then((text) => text && xterm.paste(text));
        return false;
      }
      if (event.ctrlKey && !event.shiftKey && key === 'c' && xterm.hasSelection()) {
        void navigator.clipboard?.writeText(xterm.getSelection());
        xterm.clearSelection();
        return false;
      }
      if (event.metaKey && key === 'c' && xterm.hasSelection()) return true; // native copy
      if (event.metaKey && key === 'v') return true; // native paste event
      if (primary && event.shiftKey && key === 'f') {
        event.preventDefault();
        callbacks.current.onState('running', 'search');
        return false;
      }
      // Leave the desktop's own shortcuts (Ctrl+Alt+…, Ctrl+K, Alt+Tab) to the desktop.
      if (event.ctrlKey && event.altKey) return false;
      if (event.altKey && key === 'tab') return false;
      return true;
    });
    const disposables = [
      xterm.onTitleChange((title) => callbacks.current.onTitle(title)),
      xterm.onBell(() => callbacks.current.onBell?.()),
      searchAddon.onDidChangeResults((event) =>
        setResults(
          event.resultCount > 0 ? { index: event.resultIndex, count: event.resultCount } : null,
        ),
      ),
    ];
    term.current = xterm;
    fit.current = fitAddon;
    searcher.current = searchAddon;
    register({
      paste: (text) => {
        xterm.paste(text);
        xterm.focus();
      },
      clear: () => {
        xterm.clear();
        xterm.focus();
      },
    });
    return () => {
      disposables.forEach((d) => d.dispose());
      xterm.dispose();
      term.current = null;
      fit.current = null;
      searcher.current = null;
    };
    // The terminal is created once; live option changes are applied in the effects below.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live option updates without recreating the terminal.
  useEffect(() => {
    const xterm = term.current;
    if (!xterm) return;
    xterm.options.fontSize = fontSize;
    xterm.options.cursorBlink = animations;
    xterm.options.smoothScrollDuration = animations ? 80 : 0;
    xterm.options.theme = {
      ...xterm.options.theme,
      background: theme.background,
      foreground: theme.foreground,
      cursor: theme.cursor,
      cursorAccent: theme.background,
      selectionBackground: theme.selection,
      selectionInactiveBackground: theme.selection,
    };
    fit.current?.fit();
  }, [fontSize, animations, theme]);

  // Start (or restart) the shell session.
  useEffect(() => {
    const xterm = term.current;
    if (!xterm) return;
    xterm.reset();
    fit.current?.fit();
    callbacks.current.onState('connecting');
    xterm.write(dim('Connecting to the Node.js host…\r\n'));
    const current = new ShellSession({
      cols: xterm.cols,
      rows: xterm.rows,
      shell,
      token,
      onReady: (info) => {
        xterm.reset();
        // Tell xterm about ConPTY so it can work around Windows console quirks.
        xterm.options.windowsPty =
          info.platform === 'win32' ? { backend: 'conpty', buildNumber: info.buildNumber } : {};
        callbacks.current.onState('running');
        callbacks.current.onReady(info);
        if (visible) xterm.focus();
      },
      onOutput: (data) => xterm.write(data),
      onExit: (code) => {
        callbacks.current.onState('exited', String(code));
        xterm.write(
          `\r\n${dim('Shell exited')}${code ? red(` with code ${code}`) : ''}${dim('. Press')} ${bold('Enter')} ${dim('to start a new one.')}\r\n`,
        );
      },
      onError: (message, code) => {
        callbacks.current.onState('error', message);
        xterm.write(
          `\r\n${red(message)}\r\n${dim(
            code === 'token'
              ? 'Add the token from Quick actions → Access token, then press Enter.'
              : 'Press Enter to try again.',
          )}\r\n`,
        );
      },
    });
    session.current = current;
    const input = xterm.onData((data) => {
      if (current.open) current.write(data);
      else if (current.state !== 'connecting' && data === '\r')
        callbacks.current.onState('restart');
    });
    const binary = xterm.onBinary((data) => current.write(data));
    const resize = xterm.onResize(({ cols, rows }) => current.resize(cols, rows));
    return () => {
      input.dispose();
      binary.dispose();
      resize.dispose();
      current.close();
      if (session.current === current) session.current = null;
    };
  }, [generation, shell, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the grid sized to the window; windows resize continuously while dragging.
  useEffect(() => {
    const element = host.current;
    if (!element || !visible) return;
    let frame = 0;
    const refit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (element.clientWidth > 0 && element.clientHeight > 0) fit.current?.fit();
      });
    };
    refit();
    const observer = new ResizeObserver(refit);
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [visible]);
  useEffect(() => {
    if (visible && !search) term.current?.focus();
  }, [visible, search]);
  useEffect(() => {
    if (search) {
      searchInput.current?.focus();
      searchInput.current?.select();
    } else {
      searcher.current?.clearDecorations();
      setResults(null);
    }
  }, [search]);
  const searchOptions = () => ({
    caseSensitive,
    regex,
    incremental: true,
    decorations: {
      matchBackground: 'rgba(226, 196, 126, 0.35)',
      matchBorder: 'rgba(226, 196, 126, 0.7)',
      matchOverviewRuler: '#e2c47e',
      activeMatchBackground: 'rgba(226, 196, 126, 0.75)',
      activeMatchBorder: '#e2c47e',
      activeMatchColorOverviewRuler: '#f0d69a',
    },
  });
  function find(direction: 1 | -1, text = query) {
    if (!text) {
      searcher.current?.clearDecorations();
      setResults(null);
      return;
    }
    if (direction > 0) searcher.current?.findNext(text, searchOptions());
    else searcher.current?.findPrevious(text, searchOptions());
  }
  return (
    <div className="shell-view" hidden={!visible}>
      {search && (
        <form
          className="shell-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            find(
              e.nativeEvent instanceof SubmitEvent &&
                (e.nativeEvent.submitter as HTMLButtonElement | null)?.value === 'prev'
                ? -1
                : 1,
            );
          }}
        >
          <input
            ref={searchInput}
            value={query}
            aria-label="Find in terminal"
            placeholder="Find"
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value);
              find(1, e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onCloseSearch();
              }
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                find(-1);
              }
            }}
          />
          <span className="shell-search-count" aria-live="polite">
            {query ? (results ? `${results.index + 1} of ${results.count}` : 'No results') : ''}
          </span>
          <button
            type="button"
            aria-label="Match case"
            aria-pressed={caseSensitive}
            onClick={() => setCaseSensitive((v) => !v)}
          >
            <CaseSensitive size={13} />
          </button>
          <button
            type="button"
            aria-label="Use regular expression"
            aria-pressed={regex}
            onClick={() => setRegex((v) => !v)}
          >
            <Regex size={13} />
          </button>
          <button type="submit" value="prev" aria-label="Previous match">
            <ArrowUp size={13} />
          </button>
          <button type="submit" value="next" aria-label="Next match">
            <ArrowDown size={13} />
          </button>
          <button type="button" aria-label="Close find" onClick={onCloseSearch}>
            <X size={13} />
          </button>
        </form>
      )}
      <div className="shell-host" ref={host} />
    </div>
  );
}
