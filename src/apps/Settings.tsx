import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Cpu,
  Download,
  HardDrive,
  Info,
  Laptop,
  Leaf,
  Monitor,
  Moon,
  Paintbrush,
  Palette,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Upload,
  User,
  Wallpaper,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { WALLPAPERS } from '../lib/data';
import { WindowLogo } from '../components/AppIcon';
import { Toggle } from '../components/Shared';
import { download, formatBytes } from '../lib/utils';

interface SystemInfo {
  runtime: string;
  platform: string;
  architecture: string;
  uptime: number;
  memory: { used: number; total: number };
  cpus: number;
  mode: string;
}
export function Settings({ data = 'personalization' }: { data?: string }) {
  const { prefs, files, updatePrefs, patchWindow, notify, showDialog, importFiles } =
    useWorkspace();
  const tab = data;
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [systemError, setSystemError] = useState(false);
  const [systemTick, setSystemTick] = useState(0);
  const [name, setName] = useState(prefs.name);
  const wallpaperInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setSystemError(false);
    fetch('/api/system', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setSystem)
      .catch((e) => {
        if (e.name !== 'AbortError') setSystemError(true);
      });
    return () => controller.abort();
  }, [systemTick]);
  const nav = [
    { id: 'personalization', icon: Paintbrush, name: 'Personalization' },
    { id: 'appearance', icon: SlidersHorizontal, name: 'Appearance' },
    { id: 'system', icon: Laptop, name: 'System & storage' },
    { id: 'profile', icon: User, name: 'Your profile' },
    { id: 'about', icon: Info, name: 'About this space' },
  ];
  const title = nav.find((item) => item.id === tab)?.name || 'Personalization';
  const storageBytes = new Blob([JSON.stringify(files)]).size;
  function backup() {
    download(
      JSON.stringify(
        { app: 'Window React', version: 1, exportedAt: new Date().toISOString(), files },
        null,
        2,
      ),
      `window-react-backup-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json',
    );
    notify(
      'A little peace of mind',
      'Your workspace backup is ready. Keep it somewhere safe.',
      'settings',
    );
  }
  async function restore(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify('That backup is too large', 'Please choose a Window React backup under 10 MB.');
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const backupFiles = Array.isArray(parsed) ? parsed : parsed.files;
      showDialog({
        title: 'Bring back your workspace?',
        message:
          'This replaces your current files. Export a backup first if you want to keep them.',
        confirmLabel: 'Restore backup',
        onConfirm: () => {
          if (importFiles(backupFiles))
            notify('Welcome back', 'Your workspace files have been restored.', 'explorer');
          else
            notify(
              'This backup doesn’t look quite right',
              'Choose a valid Window React workspace backup. Your current files are unchanged.',
            );
        },
      });
    } catch {
      notify('Couldn’t read that backup', 'Please choose a valid JSON backup file.');
    }
    if (importInput.current) importInput.current.value = '';
  }
  return (
    <div className="settings-app">
      <aside className="settings-sidebar">
        <div className="settings-profile">
          <span className="profile-avatar">
            <Leaf size={27} strokeWidth={1.5} />
          </span>
          <h3>{prefs.name}</h3>
          <p>Your very own little corner.</p>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => patchWindow('settings', { data: item.id })}
            >
              <item.icon size={17} strokeWidth={1.7} />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="settings-sidebar-note">
          <ShieldCheck size={17} />
          <p>
            Personal by design.
            <br />
            <strong>No account. No tracking.</strong>
          </p>
        </div>
      </aside>
      <main className="settings-main">
        <header className="settings-heading">
          <span className="eyebrow muted">A LITTLE MORE YOU</span>
          <h1>
            {title}
            <span>.</span>
          </h1>
          <p>
            {tab === 'system'
              ? 'Everything working quietly in the background.'
              : tab === 'profile'
                ? 'Put a little personality into your personal space.'
                : tab === 'about'
                  ? 'A familiar feeling. A fresh perspective.'
                  : 'Make this little corner feel like home.'}
          </p>
        </header>
        {(tab === 'personalization' || !nav.some((item) => item.id === tab)) && (
          <>
            <div
              className="wallpaper-preview"
              style={{ backgroundImage: `url(${prefs.wallpaper})` }}
            >
              <div className="mini-desktop-window">
                <div>
                  <span />
                  <span />
                  <span />
                </div>
                <section>
                  <aside />
                  <main>
                    <span />
                    <span />
                    <span />
                  </main>
                </section>
              </div>
              <div className="mini-taskbar">
                <WindowLogo size={9} />
                <span />
                <span />
                <span />
                <span />
              </div>
              <span className="wallpaper-preview-label">
                <Monitor size={12} /> Your personal desktop
              </span>
            </div>
            <div className="settings-section-title">
              <h3>Set the scene</h3>
              <button onClick={() => wallpaperInput.current?.click()}>
                <Upload size={13} />
                Your own view
              </button>
            </div>
            <div className="wallpaper-options">
              {WALLPAPERS.map((wallpaper) => (
                <button
                  key={wallpaper.id}
                  aria-label={wallpaper.name}
                  className={prefs.wallpaper === wallpaper.url ? 'selected' : ''}
                  onClick={() => updatePrefs({ wallpaper: wallpaper.url })}
                >
                  <span>
                    <img src={wallpaper.url} alt={wallpaper.name} />
                    {prefs.wallpaper === wallpaper.url && (
                      <i>
                        <Check size={13} />
                      </i>
                    )}
                  </span>
                  <strong>{wallpaper.name}</strong>
                </button>
              ))}
            </div>
            <input
              ref={wallpaperInput}
              type="file"
              className="visually-hidden"
              tabIndex={-1}
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1024 * 1024 * 2) {
                  notify('A little too big', 'Choose a wallpaper smaller than 2 MB.');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const value = String(reader.result);
                  if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(value))
                    updatePrefs({ wallpaper: value });
                  else notify('Unsupported wallpaper', 'Choose a PNG, JPEG, WebP, or GIF image.');
                };
                reader.readAsDataURL(file);
              }}
            />
            <div className="settings-section-title">
              <h3>A touch of color</h3>
              <span>Your accent, your way</span>
            </div>
            <div className="accent-options">
              {['#47745b', '#5b7ea5', '#9180ae', '#bd8777', '#ae9254', '#6b9694'].map((color) => (
                <button
                  key={color}
                  aria-label={`Set accent ${color}`}
                  style={{ background: color }}
                  className={prefs.accent === color ? 'selected' : ''}
                  onClick={() => updatePrefs({ accent: color })}
                >
                  {prefs.accent === color && <Check size={16} />}
                </button>
              ))}
            </div>
          </>
        )}
        {tab === 'appearance' && (
          <>
            <div className="settings-section-title">
              <h3>Choose your perspective</h3>
            </div>
            <div className="theme-options">
              {(['light', 'dark'] as const).map((theme) => (
                <button
                  className={`theme-option ${theme} ${prefs.theme === theme ? 'selected' : ''}`}
                  key={theme}
                  onClick={() => updatePrefs({ theme })}
                >
                  <div>
                    <aside />
                    <main>
                      <span />
                      <span />
                      <span />
                    </main>
                  </div>
                  <span>
                    {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'light' ? 'A brighter day' : 'A quieter evening'}
                    {prefs.theme === theme && <Check size={15} />}
                  </span>
                </button>
              ))}
            </div>
            <div className="settings-options">
              <div className="settings-option">
                <span className="setting-icon">
                  <Palette size={20} />
                </span>
                <div>
                  <strong>A little transparency</strong>
                  <p>Let a hint of your world shine through.</p>
                </div>
                <Toggle
                  label="Transparency effects"
                  checked={prefs.transparency}
                  onChange={(transparency) => updatePrefs({ transparency })}
                />
              </div>
              <div className="settings-option">
                <span className="setting-icon">
                  <Wallpaper size={20} />
                </span>
                <div>
                  <strong>Thoughtful motion</strong>
                  <p>Soft transitions, a little more life.</p>
                </div>
                <Toggle
                  label="Animations"
                  checked={prefs.animations}
                  onChange={(animations) => updatePrefs({ animations })}
                />
              </div>
              <div className="settings-option">
                <span className="setting-icon">
                  <Monitor size={20} />
                </span>
                <div>
                  <strong>A bigger picture</strong>
                  <p>Larger desktop icons, a little easier to see.</p>
                </div>
                <Toggle
                  label="Large desktop icons"
                  checked={prefs.largeIcons}
                  onChange={(largeIcons) => updatePrefs({ largeIcons })}
                />
              </div>
              <div className="settings-option brightness-setting">
                <span className="setting-icon">
                  <Sun size={20} />
                </span>
                <div>
                  <strong>Workspace brightness</strong>
                  <p>Just this workspace, not your actual screen.</p>
                  <input
                    type="range"
                    aria-label="Workspace brightness"
                    min="35"
                    max="100"
                    value={prefs.brightness}
                    onChange={(e) => updatePrefs({ brightness: Number(e.target.value) })}
                  />
                </div>
                <span>{prefs.brightness}%</span>
              </div>
            </div>
          </>
        )}
        {tab === 'system' && (
          <>
            <div className="system-device-card">
              <span>
                <Laptop size={45} strokeWidth={1.25} />
              </span>
              <div>
                <strong>Your browser. Your desktop.</strong>
                <p>Window React 1.0 · {navigator.platform || 'Web platform'}</p>
                <small>
                  <span className="online-dot" /> All the essentials. None of the noise.
                </small>
              </div>
            </div>
            <div className="settings-section-title">
              <h3>Under the hood</h3>
              <button onClick={() => setSystemTick((t) => t + 1)}>
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
            {systemError ? (
              <div className="settings-information">
                The Node.js server isn’t available right now. Your local files still work.
              </div>
            ) : (
              <div className="system-info-grid">
                <div>
                  <Cpu size={18} />
                  <span>
                    Runtime<strong>{system?.runtime || 'Connecting…'}</strong>
                  </span>
                </div>
                <div>
                  <Monitor size={18} />
                  <span>
                    Server platform
                    <strong>
                      {system ? `${system.platform} · ${system.architecture}` : 'Connecting…'}
                    </strong>
                  </span>
                </div>
                <div>
                  <HardDrive size={18} />
                  <span>
                    Process memory<strong>{system ? formatBytes(system.memory.used) : '—'}</strong>
                  </span>
                </div>
                <div>
                  <RefreshCw size={18} />
                  <span>
                    Server uptime
                    <strong>
                      {system
                        ? `${Math.floor(system.uptime / 60)} min ${system.uptime % 60} sec`
                        : '—'}
                    </strong>
                  </span>
                </div>
              </div>
            )}
            <div className="settings-section-title">
              <h3>Your local space</h3>
              <span>{formatBytes(storageBytes)} saved</span>
            </div>
            <div className="storage-detail">
              <div className="large-storage-meter">
                <span
                  style={{
                    width: `${Math.min(100, Math.max(3, (storageBytes / (5 * 1048576)) * 100))}%`,
                  }}
                />
              </div>
              <p>
                {files.filter((f) => !f.trashed).length} items · Browser storage · Typical limit ~5
                MB
              </p>
              <small>
                Built-in photos and audio are bundled with the app, not counted against your saved
                workspace.
              </small>
            </div>
            <div className="backup-actions">
              <button className="button primary" onClick={backup}>
                <Download size={15} />
                Export workspace
              </button>
              <button className="button secondary" onClick={() => importInput.current?.click()}>
                <Upload size={15} />
                Restore a backup
              </button>
            </div>
            <input
              ref={importInput}
              type="file"
              className="visually-hidden"
              tabIndex={-1}
              accept="application/json,.json"
              onChange={(e) => void restore(e.target.files?.[0])}
            />
            <div className="settings-reset">
              <div>
                <strong>Start with a clean slate</strong>
                <p>Reset only this app’s files and preferences in this browser.</p>
              </div>
              <button
                onClick={() =>
                  showDialog({
                    title: 'A completely fresh start?',
                    message:
                      'All Window React files, notes, events, and preferences saved in this browser will be reset. Download a backup first. This cannot be undone.',
                    danger: true,
                    confirmLabel: 'Reset workspace',
                    onConfirm: () => {
                      Object.keys(localStorage)
                        .filter((key) => key.startsWith('wr:'))
                        .forEach((key) => localStorage.removeItem(key));
                      location.reload();
                    },
                  })
                }
              >
                Reset <ChevronRight size={13} />
              </button>
            </div>
          </>
        )}
        {tab === 'profile' && (
          <>
            <div className="profile-editor-hero">
              <span>
                <Leaf size={43} strokeWidth={1.3} />
              </span>
              <h2>A space that’s beautifully yours.</h2>
              <p>No sign-ups. No passwords. Just you.</p>
            </div>
            <form
              className="profile-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) {
                  updatePrefs({ name: name.trim().slice(0, 36) });
                  notify(
                    'Nice to meet you',
                    `Your workspace now feels a little more like ${name.trim()}.`,
                  );
                }
              }}
            >
              <label htmlFor="display-name">What should we call you?</label>
              <input
                id="display-name"
                className="text-input"
                maxLength={36}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <small>This name is only used here, on this browser.</small>
              <button className="button primary" type="submit">
                Save your name <Check size={15} />
              </button>
            </form>
            <div className="privacy-note">
              <ShieldCheck size={22} />
              <div>
                <strong>Your little corner stays yours.</strong>
                <p>
                  Files, notes, and preferences stay in this browser. Weather requests use
                  Open-Meteo; external sites have their own privacy policies. We don’t have
                  accounts, analytics, or tracking.
                </p>
              </div>
            </div>
          </>
        )}
        {tab === 'about' && (
          <div className="about-content">
            <div className="about-brand">
              <WindowLogo size={63} />
              <h2>
                window <span>react</span>
              </h2>
              <p>A familiar feeling. A fresh perspective.</p>
              <span className="version-pill">VERSION 1.0 · THE QUIET EDITION</span>
            </div>
            <p>
              A thoughtfully designed desktop for the web. A place to collect ideas, make a little
              something, or simply find your quiet.
            </p>
            <div className="about-values">
              <span>
                <Leaf size={18} />
                Thoughtfully made
              </span>
              <span>
                <ShieldCheck size={18} />
                Local-first, always
              </span>
              <span>
                <Monitor size={18} />
                Open by nature
              </span>
            </div>
            <div className="about-stack">
              React 19 <span>+</span> TypeScript <span>+</span> Node.js
            </div>
            <div className="settings-information">
              Window React is an independent web desktop, not an actual operating system or a
              Microsoft product. It does not run Windows programs or access your device’s system
              files. Images and ambient soundscapes are original generated assets.
            </div>
            <a
              className="about-link"
              href="https://github.com/tiensdattnek-ai/window-react"
              target="_blank"
              rel="noreferrer"
            >
              Made to be made your own. View the source. <ArrowUpRight size={15} />
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
