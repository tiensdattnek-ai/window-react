import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BatteryFull,
  ChevronUp,
  CloudSun,
  Eye,
  FilePlus2,
  FolderPlus,
  Heart,
  Leaf,
  LockKeyhole,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useMusic } from '../context/MusicContext';
import { APPS } from '../lib/data';
import type { AppId } from '../lib/types';
import { AppIcon, WindowLogo } from './AppIcon';
import { AppWindow } from './Window';
import { Dialog, IconButton } from './Shared';
import { StartMenu } from './StartMenu';
import { Notifications, QuickSettings } from './SystemPanels';
import { Explorer } from '../apps/Explorer';
import { Notes } from '../apps/Notes';
import { Browser } from '../apps/Browser';
import { Music } from '../apps/Music';
import { Terminal } from '../apps/Terminal';
import { Settings } from '../apps/Settings';
import { Photos } from '../apps/Photos';
import { Calculator } from '../apps/Calculator';
import { Calendar } from '../apps/Calendar';
import { Weather, WeatherIcon } from '../apps/Weather';
import { Focus } from '../apps/Focus';
import { weatherLabel } from '../lib/utils';

type Panel = 'start' | 'search' | 'quick' | 'calendar' | 'notifications' | null;
const PINNED: AppId[] = ['explorer', 'browser', 'photos', 'notes', 'music', 'terminal', 'settings'];
export function Desktop() {
  const workspace = useWorkspace();
  const {
    windows,
    activeApp,
    openApp,
    focusApp,
    minimizeApp,
    prefs,
    notifications,
    toasts,
    dismissToast,
    weather,
    weatherLoading,
    notify,
    createFile,
    showDialog,
    dialog,
  } = workspace;
  const music = useMusic();
  const [panel, setPanel] = useState<Panel>(null);
  const [now, setNow] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [locked, setLocked] = useState(false);
  const [showIcons, setShowIcons] = useState(true);
  const lastVisible = useRef<AppId[]>([]);
  const [desktopVersion, setDesktopVersion] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  function showDesktop() {
    const visible = windows.filter((w) => !w.minimized).sort((a, b) => a.z - b.z);
    if (visible.length) {
      lastVisible.current = visible.map((w) => w.id);
      visible.forEach((w) => minimizeApp(w.id));
    } else lastVisible.current.forEach((id) => focusApp(id));
    setPanel(null);
  }
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (dialog || locked) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPanel((current) => (current === 'search' ? null : 'search'));
        setContextMenu(null);
      }
      if (e.key === 'Escape') {
        setPanel(null);
        setContextMenu(null);
      }
      if (e.ctrlKey && e.altKey) {
        const map: Record<string, AppId> = {
          e: 'explorer',
          t: 'terminal',
          n: 'notes',
          s: 'settings',
        };
        if (map[e.key.toLowerCase()]) {
          e.preventDefault();
          openApp(map[e.key.toLowerCase()]);
          setPanel(null);
        }
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          showDesktop();
        }
      }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        const visible = [...windows].filter((w) => !w.minimized).sort((a, b) => b.z - a.z);
        if (visible.length > 1) focusApp(visible[1].id);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [windows, dialog, locked]); // eslint-disable-line react-hooks/exhaustive-deps
  const togglePanel = (next: Panel) => {
    setPanel((current) => (current === next ? null : next));
    setContextMenu(null);
  };
  const taskbarApps = [...PINNED, ...windows.map((w) => w.id).filter((id) => !PINNED.includes(id))];
  const desktopIcons: {
    id: string;
    name: string;
    icon: AppId | 'home' | 'trash';
    action: () => void;
  }[] = [
    { id: 'home', name: 'Home', icon: 'home', action: () => openApp('explorer', 'home') },
    { id: 'files', name: 'My files', icon: 'explorer', action: () => openApp('explorer', 'root') },
    { id: 'browser', name: 'Browser', icon: 'browser', action: () => openApp('browser') },
    { id: 'notes', name: 'Notes', icon: 'notes', action: () => openApp('notes') },
    { id: 'music', name: 'Music', icon: 'music', action: () => openApp('music') },
    { id: 'trash', name: 'Recycle Bin', icon: 'trash', action: () => openApp('explorer', 'trash') },
  ];
  function createNote() {
    const id = createFile('A new little thought.md', 'text', 'documents');
    if (id) openApp('notes', id);
    setContextMenu(null);
  }
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return (
    <div
      className={`desktop ${prefs.largeIcons ? 'large-desktop-icons' : ''}`}
      style={{ backgroundImage: `url(${prefs.wallpaper})` }}
      onContextMenu={(e) => {
        if (
          (e.target as HTMLElement).closest(
            '.app-window, .taskbar, .glass-panel, .dialog-card, .desktop-context-menu',
          )
        )
          return;
        e.preventDefault();
        setPanel(null);
        setContextMenu({
          x: Math.min(e.clientX, innerWidth - 246),
          y: Math.min(e.clientY, innerHeight - 342),
        });
      }}
    >
      <div className="desktop-wallpaper-shade" />
      <div
        className="desktop-canvas"
        onClick={() => {
          setSelected(null);
          setContextMenu(null);
          setPanel(null);
        }}
      />
      <header className="desktop-header">
        <div className="desktop-wordmark">
          <WindowLogo size={25} />
          <strong>
            window <span>react</span>
          </strong>
          <span className="brand-divider" />
          <span className="desktop-edition">THE QUIET EDITION</span>
        </div>
        <div className="desktop-header-right">
          <span className="online-dot" />
          <span>Your space. Your pace.</span>
          <span className="brand-divider" />
          <span>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>
      {showIcons && (
        <nav key={desktopVersion} className="desktop-shortcuts" aria-label="Desktop shortcuts">
          {desktopIcons.map((icon) => (
            <button
              key={icon.id}
              className={`desktop-shortcut ${selected === icon.id ? 'selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(icon.id);
                setPanel(null);
              }}
              onDoubleClick={icon.action}
              onKeyDown={(e) => {
                if (e.key === 'Enter') icon.action();
              }}
              title={`Double-click to open ${icon.name}`}
            >
              <AppIcon app={icon.icon} size={45} />
              <span>{icon.name}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="desktop-clock-widget">
        <span className="eyebrow">A LITTLE MOMENT, JUST FOR YOU</span>
        <strong>{time}</strong>
        <p>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <div />
        <span className="desktop-widget-thought">
          There’s good
          <br />
          in the everyday.
        </span>
        <Leaf size={19} strokeWidth={1.3} />
      </div>
      <div className="desktop-side-note">
        <span>MAKE A LITTLE ROOM</span>
        <p>
          For your ideas.
          <br />
          For yourself.
        </p>
        <Heart size={17} strokeWidth={1.4} />
      </div>
      <div className="windows-layer">
        {windows.map((win) => (
          <AppWindow key={win.id} window={win}>
            {win.id === 'explorer' ? (
              <Explorer data={win.data} />
            ) : win.id === 'notes' ? (
              <Notes data={win.data} />
            ) : win.id === 'browser' ? (
              <Browser />
            ) : win.id === 'music' ? (
              <Music data={win.data} launchKey={win.launchKey} />
            ) : win.id === 'terminal' ? (
              <Terminal />
            ) : win.id === 'settings' ? (
              <Settings data={win.data} />
            ) : win.id === 'photos' ? (
              <Photos data={win.data} />
            ) : win.id === 'calculator' ? (
              <Calculator />
            ) : win.id === 'calendar' ? (
              <Calendar />
            ) : win.id === 'weather' ? (
              <Weather />
            ) : (
              <Focus />
            )}
          </AppWindow>
        ))}
      </div>
      {panel && <div className="overlay-backdrop" onPointerDown={() => setPanel(null)} />}
      {(panel === 'start' || panel === 'search') && (
        <StartMenu
          searchMode={panel === 'search'}
          onClose={() => setPanel(null)}
          onLock={() => {
            setLocked(true);
            setPanel(null);
          }}
        />
      )}
      {panel === 'quick' && <QuickSettings onClose={() => setPanel(null)} />}
      {panel === 'notifications' && <Notifications onClose={() => setPanel(null)} />}
      {panel === 'calendar' && (
        <section className="calendar-popover glass-panel" aria-label="Calendar panel">
          <header>
            <span>
              {now.toLocaleDateString('en-US', { weekday: 'long' })}
              <strong>{time}</strong>
            </span>
            <div>
              <p>
                {now.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <button
                onClick={() => {
                  openApp('calendar');
                  setPanel(null);
                }}
              >
                Open your calendar <ArrowRight size={12} />
              </button>
            </div>
          </header>
          <Calendar compact />
        </section>
      )}
      <footer className="taskbar">
        <button
          className="taskbar-weather"
          title="Open live weather"
          aria-label="Open Weather"
          onClick={() => {
            openApp('weather');
            setPanel(null);
          }}
        >
          {weather ? (
            <WeatherIcon code={weather.current.weather_code} size={32} />
          ) : (
            <CloudSun size={32} strokeWidth={1.3} />
          )}
          <span>
            <strong>
              {weather
                ? `${Math.round(weather.current.temperature_2m)}°`
                : weatherLoading
                  ? 'A little look…'
                  : 'Your forecast'}
              {weather && <span>{weather.city}</span>}
            </strong>
            <small>
              {weather
                ? weatherLabel(weather.current.weather_code)
                : weatherLoading
                  ? 'Outside your window'
                  : 'Look at the sky'}
            </small>
          </span>
        </button>
        <div className="taskbar-center">
          <button
            className={`taskbar-start ${panel === 'start' ? 'active' : ''}`}
            aria-label="Open Start menu"
            title="Start"
            onClick={() => togglePanel('start')}
          >
            <WindowLogo size={28} />
          </button>
          <div className="taskbar-separator" />
          <button
            className={`taskbar-search ${panel === 'search' ? 'active' : ''}`}
            onClick={() => togglePanel('search')}
          >
            <Search size={16} />
            <span>Search anything</span>
            <kbd>⌃ K</kbd>
          </button>
          <div className="taskbar-apps">
            {taskbarApps.map((id) => {
              const app = APPS.find((a) => a.id === id)!;
              const win = windows.find((w) => w.id === id);
              return (
                <button
                  className={`taskbar-app ${win ? 'is-open' : ''} ${activeApp === id ? 'is-active' : ''} ${id === 'music' && music.playing ? 'is-playing' : ''}`}
                  key={id}
                  aria-label={`Open ${app.name}`}
                  title={app.name}
                  onClick={() => {
                    setPanel(null);
                    if (win) {
                      if (activeApp === id && !win.minimized) minimizeApp(id);
                      else focusApp(id);
                    } else openApp(id);
                  }}
                >
                  <AppIcon app={id} size={34} />
                  <span className="taskbar-tooltip">
                    {app.name}
                    {id === 'music' && music.playing && <small>{music.track.title}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="taskbar-tray">
          <IconButton
            label="System controls"
            className={`tray-chevron ${panel === 'quick' ? 'active' : ''}`}
            onClick={() => togglePanel('quick')}
          >
            <ChevronUp size={15} />
          </IconButton>
          <button
            className={`tray-system ${panel === 'quick' ? 'active' : ''}`}
            aria-label="Open quick settings"
            onClick={() => togglePanel('quick')}
          >
            {prefs.wifi && !prefs.airplane ? <Wifi size={16} /> : <WifiOff size={16} />}
            {prefs.volume ? <Volume2 size={17} /> : <VolumeX size={17} />}
            <BatteryFull size={20} />
          </button>
          <span className="tray-divider" />
          <button
            className={`tray-clock ${panel === 'calendar' ? 'active' : ''}`}
            aria-label="Open calendar"
            onClick={() => togglePanel('calendar')}
          >
            <strong>{time}</strong>
            <span>{now.toLocaleDateString('en-GB')}</span>
          </button>
          <button
            className={`tray-notifications ${panel === 'notifications' ? 'active' : ''}`}
            aria-label="Open notifications"
            onClick={() => togglePanel('notifications')}
          >
            {prefs.focus ? <Moon size={17} /> : <Bell size={17} />}
            {notifications.length > 0 && <i />}
          </button>
          <button
            className="show-desktop-button"
            title="Show desktop · Ctrl Alt D"
            aria-label="Show desktop"
            onClick={showDesktop}
          />
        </div>
      </footer>
      {contextMenu && (
        <>
          <div
            className="context-dismiss desktop-context-dismiss"
            onPointerDown={() => setContextMenu(null)}
          />
          <div
            className="context-menu desktop-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="desktop-context-heading">
              <WindowLogo size={15} />
              Your little space
            </div>
            <button
              onClick={() => {
                setShowIcons(!showIcons);
                setContextMenu(null);
              }}
            >
              <Eye size={16} />
              {showIcons ? 'Hide desktop icons' : 'Show desktop icons'}
            </button>
            <button
              onClick={() => {
                setDesktopVersion((v) => v + 1);
                setContextMenu(null);
                notify(
                  'A fresh little start',
                  'Your desktop is refreshed. Everything is right where it belongs.',
                );
              }}
            >
              <RefreshCw size={15} />
              Refresh<kbd>↻</kbd>
            </button>
            <div className="menu-separator" />
            <button
              onClick={() => {
                setContextMenu(null);
                showDialog({
                  title: 'Make a little room.',
                  input: true,
                  initialValue: 'Untitled folder',
                  confirmLabel: 'Create folder',
                  onConfirm: (name) => {
                    const id = createFile(name, 'folder', 'root');
                    if (id) openApp('explorer', 'root');
                  },
                });
              }}
            >
              <FolderPlus size={16} />
              New folder
            </button>
            <button onClick={createNote}>
              <FilePlus2 size={16} />A new note
            </button>
            <div className="menu-separator" />
            <button
              onClick={() => {
                openApp('settings', 'personalization');
                setContextMenu(null);
              }}
            >
              <Palette size={16} />
              Make it yours
            </button>
            <button
              onClick={() => {
                openApp('settings', 'appearance');
                setContextMenu(null);
              }}
            >
              <Monitor size={16} />
              Display & appearance
            </button>
            <button
              onClick={() => {
                setContextMenu(null);
                setLocked(true);
              }}
            >
              <LockKeyhole size={15} />
              Take a pause
            </button>
          </div>
        </>
      )}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <article className="toast glass-panel" key={toast.id}>
            <span className="toast-symbol">
              <AppIcon app={toast.app || 'home'} size={27} />
            </span>
            <button
              className="toast-content"
              onClick={() => {
                if (toast.app) openApp(toast.app);
                dismissToast(toast.id);
              }}
            >
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </button>
            <IconButton label="Dismiss notification" onClick={() => dismissToast(toast.id)}>
              <X size={14} />
            </IconButton>
          </article>
        ))}
      </div>
      {locked && (
        <div className="lock-screen" style={{ backgroundImage: `url(${prefs.wallpaper})` }}>
          <div className="lock-screen-shade" />
          <div className="lock-clock">
            <strong>{time}</strong>
            <span>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="lock-profile">
            <span>
              <Leaf size={38} strokeWidth={1.3} />
            </span>
            <h1>A little pause feels good.</h1>
            <p>Everything is right where you left it.</p>
            <button autoFocus onClick={() => setLocked(false)}>
              Welcome back <ArrowRight size={17} />
            </button>
            <small>{prefs.name} · This is a pause screen, not a security lock.</small>
          </div>
          <div className="lock-brand">
            <WindowLogo size={20} />
            window react
          </div>
        </div>
      )}
      <Dialog />
      <div className="brightness-overlay" style={{ opacity: (100 - prefs.brightness) / 100 }} />
    </div>
  );
}
