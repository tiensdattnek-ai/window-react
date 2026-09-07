import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Circle,
  Copy,
  Eraser,
  KeyRound,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  TerminalSquare,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import type { ShellTheme } from './ShellView';
import { WorkspaceShell } from './WorkspaceShell';
import { TOKEN_KEY } from '../lib/shell';
import type { ShellChoice, ShellInfo, ShellState } from '../lib/shell';
import type { ShellApi } from './WorkspaceShell';
import { safeRead } from '../lib/utils';
import '@fontsource-variable/jetbrains-mono';

interface Tab {
  id: number;
  kind: 'shell' | 'workspace';
  /** Requested shell id; stays fixed for the life of the tab so the session is never restarted. */
  shell?: string;
  /** Shell id the server actually started (e.g. the default when none was requested). */
  resolvedShell?: string;
  title: string;
  state: ShellState;
  detail?: string;
  generation: number;
  bell?: boolean;
}
interface ShellStatus {
  enabled: boolean;
  reason?: string | null;
  code?: string | null;
  cwd?: string;
  shells?: ShellChoice[];
  protected?: boolean;
}
const FONT_KEY = 'wr:terminal-font';
const SHELL_KEY = 'wr:terminal-shell';
const MIN_FONT = 9;
const MAX_FONT = 22;
interface QuickAction {
  label: string;
  hint: string;
  command: (info: ShellInfo | null) => string;
}
// Typed into the active shell as if the user had, so they work in PowerShell, cmd and bash alike.
const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Install opencode',
    hint: 'npm i -g opencode-ai',
    command: () => 'npm i -g opencode-ai\r',
  },
  { label: 'Run opencode', hint: 'AI coding agent, right here', command: () => 'opencode\r' },
  {
    label: 'Go to the project folder',
    hint: 'cd <window-react>',
    command: (info) => (info?.root ? `cd "${info.root}"\r` : 'cd\r'),
  },
  { label: 'Node & npm versions', hint: 'node -v && npm -v', command: () => 'node -v && npm -v\r' },
  { label: 'Git status', hint: 'git status', command: () => 'git status\r' },
  {
    label: 'List files',
    hint: 'ls / dir',
    command: (info) => (info?.platform === 'win32' && info.shell === 'cmd' ? 'dir\r' : 'ls\r'),
  },
];
// xterm.js and its addons are only needed by the real shell, so they load on first use.
const ShellView = lazy(() => import('./ShellView').then((m) => ({ default: m.ShellView })));
let nextTab = 1;
function makeTab(kind: Tab['kind'], shell?: string, title?: string): Tab {
  return {
    id: nextTab++,
    kind,
    shell,
    title: title || (kind === 'workspace' ? 'Workspace shell' : 'Shell'),
    state: kind === 'workspace' ? 'running' : 'connecting',
    generation: 0,
  };
}
export function Terminal() {
  const { prefs, notify, activeApp } = useWorkspace();
  const [status, setStatus] = useState<ShellStatus | null>(null);
  const [statusTick, setStatusTick] = useState(0);
  const [tabs, setTabs] = useState<Tab[]>(() => [makeTab('shell', safeRead(SHELL_KEY, ''))]);
  const [active, setActive] = useState<number>(() => tabs[0].id);
  const [fontSize, setFontSize] = useState<number>(() =>
    Math.min(MAX_FONT, Math.max(MIN_FONT, safeRead(FONT_KEY, 13))),
  );
  const [menu, setMenu] = useState<'new' | 'actions' | null>(null);
  const [search, setSearch] = useState(false);
  const [token, setToken] = useState<string>(() => safeRead(TOKEN_KEY, ''));
  const [askToken, setAskToken] = useState(false);
  const [info, setInfo] = useState<ShellInfo | null>(null);
  const shellRefs = useRef(new Map<number, ShellApi>());
  const menuRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs.find((t) => t.id === active) || tabs[0];
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/system', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((system) =>
        setStatus(system.shell ?? { enabled: false, reason: 'Node.js is unavailable.' }),
      )
      .catch((e) => {
        if (e.name !== 'AbortError')
          setStatus({ enabled: false, reason: 'Node.js is unavailable.' });
      });
    return () => controller.abort();
  }, [statusTick]);
  useEffect(() => localStorage.setItem(FONT_KEY, JSON.stringify(fontSize)), [fontSize]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu]);
  const theme = useMemo<ShellTheme>(
    () => ({
      background: '#172a24',
      foreground: '#d8e3d2',
      cursor: '#c9deb5',
      selection: 'rgba(151, 186, 126, 0.32)',
      accent: prefs.accent,
    }),
    [prefs.accent],
  );
  const patchTab = useCallback((id: number, patch: Partial<Tab> | ((tab: Tab) => Partial<Tab>)) => {
    setTabs((items) =>
      items.map((tab) =>
        tab.id === id ? { ...tab, ...(typeof patch === 'function' ? patch(tab) : patch) } : tab,
      ),
    );
  }, []);
  function openTab(kind: Tab['kind'], shell?: string) {
    const tab = makeTab(kind, shell, status?.shells?.find((s) => s.id === shell)?.name);
    if (kind === 'shell') localStorage.setItem(SHELL_KEY, JSON.stringify(shell || ''));
    setTabs((items) => [...items, tab]);
    setActive(tab.id);
    setMenu(null);
    setSearch(false);
  }
  function closeTab(id: number) {
    setTabs((items) => {
      const index = items.findIndex((t) => t.id === id);
      const next = items.filter((t) => t.id !== id);
      if (!next.length) {
        const fresh = makeTab('shell', safeRead(SHELL_KEY, ''));
        setActive(fresh.id);
        return [fresh];
      }
      if (id === active) setActive(next[Math.max(0, index - 1)].id);
      return next;
    });
    shellRefs.current.delete(id);
  }
  function restart(id: number) {
    patchTab(id, (tab) => ({
      generation: tab.generation + 1,
      state: 'connecting',
      detail: undefined,
    }));
  }
  function runQuickAction(action: QuickAction) {
    setMenu(null);
    if (activeTab.kind !== 'shell' || activeTab.state !== 'running') {
      notify('Open a shell first', 'Quick actions type into a running shell tab.', 'terminal');
      return;
    }
    shellRefs.current.get(activeTab.id)?.paste(action.command(info));
  }
  function copySelection() {
    const text = window.getSelection()?.toString();
    if (text) void navigator.clipboard?.writeText(text);
  }
  // Ctrl+Shift+T new tab, Ctrl+Shift+W close tab, Ctrl+Tab cycle, Ctrl+= / Ctrl+- zoom.
  useEffect(() => {
    if (activeApp !== 'terminal') return;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.ctrlKey && e.shiftKey && key === 't') {
        e.preventDefault();
        openTab('shell', safeRead(SHELL_KEY, ''));
      } else if (e.ctrlKey && e.shiftKey && key === 'w') {
        e.preventDefault();
        closeTab(active);
      } else if (e.ctrlKey && key === 'tab') {
        e.preventDefault();
        const index = tabs.findIndex((t) => t.id === active);
        const next = tabs[(index + (e.shiftKey ? tabs.length - 1 : 1)) % tabs.length];
        if (next) setActive(next.id);
      } else if ((e.ctrlKey || e.metaKey) && (key === '=' || key === '+')) {
        e.preventDefault();
        setFontSize((size) => Math.min(MAX_FONT, size + 1));
      } else if ((e.ctrlKey || e.metaKey) && key === '-') {
        e.preventDefault();
        setFontSize((size) => Math.max(MIN_FONT, size - 1));
      } else if ((e.ctrlKey || e.metaKey) && key === '0' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setFontSize(13);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const shellAvailable = status?.enabled !== false;
  const stateLabel =
    activeTab.kind === 'workspace'
      ? 'Virtual workspace shell — safe, in-browser'
      : activeTab.state === 'connecting'
        ? 'Connecting to the Node.js host…'
        : activeTab.state === 'running'
          ? `Real ${info?.shellName || 'shell'} on ${info?.host || 'the Node.js host'} · pid ${info?.pid ?? '—'} · ${info?.cwd || ''}`
          : activeTab.state === 'exited'
            ? `Shell exited${activeTab.detail && activeTab.detail !== '0' ? ` with code ${activeTab.detail}` : ''} · press Enter to start a new one`
            : activeTab.detail || 'Shell unavailable';
  return (
    <div
      className="terminal-app terminal-pro"
      data-state={activeTab.kind === 'shell' ? activeTab.state : 'workspace'}
    >
      <div className="terminal-tabbar" ref={menuRef}>
        <div className="terminal-tabs" role="tablist" aria-label="Terminal tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={tab.id === active}
              className={`terminal-tab ${tab.id === active ? 'is-active' : ''} ${tab.bell ? 'has-bell' : ''}`}
              onClick={() => {
                setActive(tab.id);
                setSearch(false);
                patchTab(tab.id, { bell: false });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActive(tab.id);
                }
              }}
              onAuxClick={(e) => {
                if (e.button === 1) closeTab(tab.id);
              }}
              title={tab.title}
            >
              {tab.kind === 'workspace' ? (
                <ShieldCheck size={12} />
              ) : tab.state === 'connecting' ? (
                <Loader2 size={12} className="spinning" />
              ) : tab.state === 'running' ? (
                <SquareTerminal size={12} />
              ) : (
                <Circle size={10} />
              )}
              <span>{tab.title}</span>
              <button
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          <div className="terminal-newtab">
            <button
              aria-label="New shell tab"
              title="New tab (Ctrl + Shift + T)"
              onClick={() => openTab('shell', safeRead(SHELL_KEY, ''))}
            >
              <Plus size={13} />
            </button>
            <button
              aria-label="Choose a shell"
              aria-expanded={menu === 'new'}
              onClick={() => setMenu(menu === 'new' ? null : 'new')}
            >
              <ChevronDown size={12} />
            </button>
            {menu === 'new' && (
              <div className="terminal-menu" role="menu">
                <span className="terminal-menu-heading">Open a new tab</span>
                {(status?.shells || []).map((shell) => (
                  <button key={shell.id} role="menuitem" onClick={() => openTab('shell', shell.id)}>
                    <SquareTerminal size={13} />
                    {shell.name}
                    {(activeTab.resolvedShell || activeTab.shell || status?.shells?.[0]?.id) ===
                      shell.id && <Check size={12} />}
                  </button>
                ))}
                {!status?.shells?.length && (
                  <button role="menuitem" onClick={() => openTab('shell')}>
                    <SquareTerminal size={13} />
                    Default shell
                  </button>
                )}
                <button role="menuitem" onClick={() => openTab('workspace')}>
                  <ShieldCheck size={13} />
                  Workspace shell (virtual files)
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="terminal-tools">
          <button
            className="terminal-actions-button"
            aria-expanded={menu === 'actions'}
            onClick={() => setMenu(menu === 'actions' ? null : 'actions')}
          >
            <Sparkles size={12} /> Quick actions <ChevronDown size={11} />
          </button>
          {menu === 'actions' && (
            <div className="terminal-menu terminal-menu-right" role="menu">
              <span className="terminal-menu-heading">Type into the active shell</span>
              {QUICK_ACTIONS.map((action) => (
                <button key={action.label} role="menuitem" onClick={() => runQuickAction(action)}>
                  <span>
                    {action.label}
                    <small>{action.hint}</small>
                  </span>
                </button>
              ))}
              <span className="terminal-menu-heading">This tab</span>
              <button role="menuitem" onClick={copySelection}>
                <Copy size={13} /> Copy selection
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  shellRefs.current.get(activeTab.id)?.clear();
                }}
              >
                <Eraser size={13} /> Clear screen
              </button>
              {activeTab.kind === 'shell' && (
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    restart(activeTab.id);
                  }}
                >
                  <RotateCcw size={13} /> Restart shell
                </button>
              )}
              {status?.protected && (
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    setAskToken(true);
                  }}
                >
                  <KeyRound size={13} /> Access token…
                </button>
              )}
            </div>
          )}
          {activeTab.kind === 'shell' && (
            <button
              aria-label="Find in terminal"
              aria-pressed={search}
              title="Find (Ctrl + Shift + F)"
              onClick={() => setSearch((v) => !v)}
            >
              <Search size={13} />
            </button>
          )}
          <span className="terminal-zoom" aria-label="Text size">
            <button
              aria-label="Smaller text"
              onClick={() => setFontSize((s) => Math.max(MIN_FONT, s - 1))}
            >
              <Minus size={11} />
            </button>
            <b>{fontSize}</b>
            <button
              aria-label="Larger text"
              onClick={() => setFontSize((s) => Math.min(MAX_FONT, s + 1))}
            >
              <Plus size={11} />
            </button>
          </span>
        </div>
      </div>
      <div className="terminal-body">
        {tabs.map((tab) =>
          tab.kind === 'workspace' ? (
            <div key={tab.id} className="terminal-pane" hidden={tab.id !== active}>
              <WorkspaceShell
                visible={tab.id === active}
                register={(api) => shellRefs.current.set(tab.id, api)}
              />
            </div>
          ) : (
            <Suspense
              key={tab.id}
              fallback={
                <div className="terminal-loading" hidden={tab.id !== active}>
                  <Loader2 size={14} className="spinning" /> Loading terminal…
                </div>
              }
            >
              <ShellView
                shell={tab.shell}
                token={token}
                generation={tab.generation}
                theme={theme}
                fontSize={fontSize}
                animations={prefs.animations}
                visible={tab.id === active}
                search={search && tab.id === active}
                onCloseSearch={() => setSearch(false)}
                register={(api) => shellRefs.current.set(tab.id, api)}
                onState={(state, detail) => {
                  if (state === 'restart') {
                    restart(tab.id);
                    return;
                  }
                  if (state === 'search') {
                    setSearch(true);
                    return;
                  }
                  patchTab(tab.id, { state, detail });
                  if (state === 'error' && detail && /token/i.test(detail)) setAskToken(true);
                  if (state === 'error' && /node-pty|turned off/i.test(detail || ''))
                    setStatusTick((t) => t + 1);
                }}
                onReady={(ready) => {
                  setInfo(ready);
                  patchTab(tab.id, { title: ready.shellName, resolvedShell: ready.shell });
                  setStatus((current) => ({
                    ...(current || { enabled: true }),
                    enabled: true,
                    shells: ready.shells,
                    cwd: ready.cwd,
                  }));
                }}
                onTitle={(title) => {
                  if (title.trim()) patchTab(tab.id, { title: title.trim().slice(0, 40) });
                }}
                onBell={() => {
                  if (tab.id !== active) patchTab(tab.id, { bell: true });
                }}
              />
            </Suspense>
          ),
        )}
        {askToken && (
          <form
            className="terminal-token"
            onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
              setAskToken(false);
              restart(activeTab.id);
            }}
          >
            <KeyRound size={16} />
            <div>
              <strong>This server asks for an access token.</strong>
              <p>Paste the value of WR_SHELL_TOKEN from the machine running Window React.</p>
              <input
                autoFocus
                type="password"
                value={token}
                aria-label="Shell access token"
                placeholder="Access token"
                onChange={(e) => setToken(e.target.value)}
              />
              <div className="terminal-token-actions">
                <button type="submit">Connect</button>
                <button type="button" onClick={() => setAskToken(false)}>
                  Not now
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
      <div className="terminal-status">
        <span className="terminal-status-state">
          {activeTab.kind === 'workspace' ? (
            <ShieldCheck size={12} />
          ) : activeTab.state === 'running' ? (
            <TerminalSquare size={12} />
          ) : activeTab.state === 'connecting' ? (
            <Loader2 size={12} className="spinning" />
          ) : (
            <Circle size={10} />
          )}
          <span title={stateLabel}>{stateLabel}</span>
        </span>
        <span>
          {!shellAvailable && status?.reason && (
            <button
              className="terminal-status-warning"
              onClick={() => setStatusTick((t) => t + 1)}
              title={status.reason}
            >
              {status.code === 'disabled' ? 'Shell off (WR_SHELL)' : 'node-pty missing · retry'}
            </button>
          )}
          {info?.platform === 'win32' ? 'ConPTY' : 'PTY'} <span className="status-divider" />
          xterm-256color <span className="status-divider" />
          UTF-8
        </span>
      </div>
    </div>
  );
}
